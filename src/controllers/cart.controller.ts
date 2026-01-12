import { Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';

// Get cart
export const getCart = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  const { data: cartItems, error } = await supabase
    .from('CartItem')
    .select(`
      id,
      quantity,
      createdAt,
      product:Product(id, name, price, imageUrl, stock, storeId, store:Store!Product_storeId_fkey(id, name))
    `)
    .eq('userId', userId)
    .order('createdAt', { ascending: false });

  if (error) {
    throw createError('Failed to fetch cart', 500);
  }

  // Calculate totals
  let subtotal = 0;
  const items = cartItems?.map((item) => {
    const product = item.product as any;
    const itemTotal = product.price * item.quantity;
    subtotal += itemTotal;
    return {
      ...item,
      itemTotal,
    };
  }) || [];

  res.json({
    success: true,
    data: {
      items,
      subtotal,
      itemCount: items.length,
    },
  });
};

// Add item to cart
export const addToCart = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { productId, quantity = 1 } = req.body;

  // Check if product exists
  const { data: product } = await supabase
    .from('Product')
    .select('id, stock, isActive')
    .eq('id', productId)
    .single();

  if (!product) {
    throw createError('Product not found', 404);
  }

  if (!product.isActive) {
    throw createError('Product is not available', 400);
  }

  if (product.stock < quantity) {
    throw createError('Insufficient stock', 400);
  }

  // Check if item already in cart
  const { data: existingItem } = await supabase
    .from('CartItem')
    .select('id, quantity')
    .eq('userId', userId)
    .eq('productId', productId)
    .single();

  if (existingItem) {
    // Update quantity
    const newQuantity = existingItem.quantity + quantity;
    
    if (product.stock < newQuantity) {
      throw createError('Insufficient stock for requested quantity', 400);
    }

    const { data: updatedItem, error } = await supabase
      .from('CartItem')
      .update({
        quantity: newQuantity,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', existingItem.id)
      .select('*')
      .single();

    if (error) {
      throw createError('Failed to update cart', 500);
    }

    return res.json({
      success: true,
      message: 'Cart updated',
      data: updatedItem,
    });
  }

  // Add new item
  const { data: cartItem, error } = await supabase
    .from('CartItem')
    .insert({
      userId,
      productId,
      quantity,
    })
    .select('*')
    .single();

  if (error) {
    throw createError('Failed to add to cart', 500);
  }

  res.status(201).json({
    success: true,
    message: 'Item added to cart',
    data: cartItem,
  });
};

// Update cart item quantity
export const updateCartItem = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { productId } = req.params;
  const { quantity } = req.body;

  // Check if item exists in cart
  const { data: cartItem } = await supabase
    .from('CartItem')
    .select('id')
    .eq('userId', userId)
    .eq('productId', productId)
    .single();

  if (!cartItem) {
    throw createError('Item not found in cart', 404);
  }

  // Check stock
  const { data: product } = await supabase
    .from('Product')
    .select('stock')
    .eq('id', productId)
    .single();

  if (product && product.stock < quantity) {
    throw createError('Insufficient stock', 400);
  }

  const { data: updatedItem, error } = await supabase
    .from('CartItem')
    .update({
      quantity,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', cartItem.id)
    .select('*')
    .single();

  if (error) {
    throw createError('Failed to update cart item', 500);
  }

  res.json({
    success: true,
    message: 'Cart item updated',
    data: updatedItem,
  });
};

// Remove item from cart
export const removeFromCart = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { productId } = req.params;

  const { error } = await supabase
    .from('CartItem')
    .delete()
    .eq('userId', userId)
    .eq('productId', productId);

  if (error) {
    throw createError('Failed to remove item from cart', 500);
  }

  res.json({
    success: true,
    message: 'Item removed from cart',
  });
};

// Clear cart
export const clearCart = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  const { error } = await supabase
    .from('CartItem')
    .delete()
    .eq('userId', userId);

  if (error) {
    throw createError('Failed to clear cart', 500);
  }

  res.json({
    success: true,
    message: 'Cart cleared',
  });
};
