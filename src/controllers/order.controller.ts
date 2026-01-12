import { Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';

// Get user's orders
export const getUserOrders = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { page = 1, limit = 10 } = req.query;

  const offset = (Number(page) - 1) * Number(limit);

  const { data: orders, error, count } = await supabase
    .from('Order')
    .select(`
      *,
      items:OrderItem(
        id,
        quantity,
        unitPrice,
        product:Product(id, name, imageUrl)
      )
    `, { count: 'exact' })
    .eq('userId', userId)
    .order('createdAt', { ascending: false })
    .range(offset, offset + Number(limit) - 1);

  if (error) {
    throw createError('Failed to fetch orders', 500);
  }

  res.json({
    success: true,
    data: orders,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: count || 0,
      totalPages: Math.ceil((count || 0) / Number(limit)),
    },
  });
};

// Get order by ID
export const getOrderById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  const { data: order, error } = await supabase
    .from('Order')
    .select(`
      *,
      items:OrderItem(
        id,
        quantity,
        unitPrice,
        product:Product(id, name, imageUrl, store:Store!Product_storeId_fkey(id, name))
      )
    `)
    .eq('id', id)
    .single();

  if (error || !order) {
    throw createError('Order not found', 404);
  }

  // Check if user owns the order or is admin
  if (order.userId !== userId && userRole !== 'ADMIN') {
    throw createError('Not authorized to view this order', 403);
  }

  res.json({
    success: true,
    data: order,
  });
};

// Create order from cart
export const createOrder = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { shippingAddress } = req.body;

  // Get cart items
  const { data: cartItems, error: cartError } = await supabase
    .from('CartItem')
    .select(`
      id,
      quantity,
      product:Product(id, price, stock, name)
    `)
    .eq('userId', userId);

  if (cartError) {
    throw createError('Failed to fetch cart', 500);
  }

  if (!cartItems || cartItems.length === 0) {
    throw createError('Cart is empty', 400);
  }

  // Validate stock and calculate total
  let totalPrice = 0;
  const orderItems: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }> = [];

  for (const item of cartItems) {
    const product = item.product as any;
    
    if (product.stock < item.quantity) {
      throw createError(`Insufficient stock for ${product.name}`, 400);
    }

    totalPrice += product.price * item.quantity;
    orderItems.push({
      productId: product.id,
      quantity: item.quantity,
      unitPrice: product.price,
    });
  }

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('Order')
    .insert({
      userId,
      totalPrice,
      shippingAddress,
      status: 'PENDING',
    })
    .select('*')
    .single();

  if (orderError) {
    throw createError('Failed to create order', 500);
  }

  // Create order items
  const orderItemsData = orderItems.map((item) => ({
    ...item,
    orderId: order.id,
  }));

  const { error: itemsError } = await supabase
    .from('OrderItem')
    .insert(orderItemsData);

  if (itemsError) {
    // Rollback order
    await supabase.from('Order').delete().eq('id', order.id);
    throw createError('Failed to create order items', 500);
  }

  // Update product stock
  for (const item of orderItems) {
    const product = cartItems.find((c) => (c.product as any).id === item.productId)?.product as any;
    await supabase
      .from('Product')
      .update({ stock: product.stock - item.quantity })
      .eq('id', item.productId);
  }

  // Clear cart
  await supabase.from('CartItem').delete().eq('userId', userId);

  // Fetch complete order with items
  const { data: completeOrder } = await supabase
    .from('Order')
    .select(`
      *,
      items:OrderItem(
        id,
        quantity,
        unitPrice,
        product:Product(id, name, imageUrl)
      )
    `)
    .eq('id', order.id)
    .single();

  res.status(201).json({
    success: true,
    message: 'Order placed successfully',
    data: completeOrder,
  });
};

// Update order status
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const { data: order, error } = await supabase
    .from('Order')
    .update({
      status,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw createError('Failed to update order status', 500);
  }

  res.json({
    success: true,
    message: 'Order status updated',
    data: order,
  });
};

// Cancel order
export const cancelOrder = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  // Check if order exists and belongs to user
  const { data: order, error: fetchError } = await supabase
    .from('Order')
    .select('userId, status')
    .eq('id', id)
    .single();

  if (fetchError || !order) {
    throw createError('Order not found', 404);
  }

  if (order.userId !== userId) {
    throw createError('Not authorized to cancel this order', 403);
  }

  if (['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(order.status)) {
    throw createError(`Cannot cancel order with status: ${order.status}`, 400);
  }

  // Get order items to restore stock
  const { data: orderItems } = await supabase
    .from('OrderItem')
    .select('productId, quantity')
    .eq('orderId', id);

  // Restore product stock
  if (orderItems) {
    for (const item of orderItems) {
      const { data: product } = await supabase
        .from('Product')
        .select('stock')
        .eq('id', item.productId)
        .single();

      if (product) {
        await supabase
          .from('Product')
          .update({ stock: product.stock + item.quantity })
          .eq('id', item.productId);
      }
    }
  }

  // Update order status
  const { data: cancelledOrder, error } = await supabase
    .from('Order')
    .update({
      status: 'CANCELLED',
      updatedAt: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw createError('Failed to cancel order', 500);
  }

  res.json({
    success: true,
    message: 'Order cancelled successfully',
    data: cancelledOrder,
  });
};
