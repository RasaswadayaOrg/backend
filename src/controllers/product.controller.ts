import { Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';

// Get all products
export const getProducts = async (req: AuthRequest, res: Response) => {
  const {
    category,
    search,
    minPrice,
    maxPrice,
    page = 1,
    limit = 12,
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);

  let query = supabase
    .from('Product')
    .select('*, store:Store!Product_storeId_fkey(id, name)', { count: 'exact' })
    .eq('isActive', true);

  if (category) {
    query = query.eq('category', category);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  if (minPrice) {
    query = query.gte('price', Number(minPrice));
  }

  if (maxPrice) {
    query = query.lte('price', Number(maxPrice));
  }

  query = query.order('createdAt', { ascending: false });
  query = query.range(offset, offset + Number(limit) - 1);

  const { data: products, error, count } = await query;

  if (error) {
    throw createError('Failed to fetch products', 500);
  }

  res.json({
    success: true,
    data: products,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: count || 0,
      totalPages: Math.ceil((count || 0) / Number(limit)),
    },
  });
};

// Get product categories
export const getCategories = async (req: AuthRequest, res: Response) => {
  const { data: categories, error } = await supabase
    .from('Category')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw createError('Failed to fetch categories', 500);
  }

  res.json({
    success: true,
    data: categories,
  });
};

// Get product by ID
export const getProductById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const { data: product, error } = await supabase
    .from('Product')
    .select(`
      *,
      store:Store!Product_storeId_fkey(id, name, location, rating)
    `)
    .eq('id', id)
    .single();

  if (error || !product) {
    throw createError('Product not found', 404);
  }

  res.json({
    success: true,
    data: product,
  });
};

// Create product
export const createProduct = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  let { storeId } = req.body;
  const {
    name,
    description,
    price,
    imageUrl,
    images,
    category,
    stock,
  } = req.body;

  // If not admin, get user's store
  if (userRole !== 'ADMIN') {
    const { data: store } = await supabase
      .from('Store')
      .select('id')
      .eq('ownerId', userId)
      .single();

    if (!store) {
      throw createError('You do not have a store. Create a store first.', 400);
    }
    storeId = store.id;
  }

  if (!storeId) {
    throw createError('Store ID is required', 400);
  }

  const { data: product, error } = await supabase
    .from('Product')
    .insert({
      name,
      description: description || null,
      price,
      imageUrl: imageUrl || null,
      images: images || [],
      category: category || null,
      stock: stock || 0,
      storeId,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Create product error:', error);
    throw createError('Failed to create product', 500);
  }

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: product,
  });
};

// Update product
export const updateProduct = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  // Check ownership
  const { data: product, error: fetchError } = await supabase
    .from('Product')
    .select('storeId, store:Store!Product_storeId_fkey(ownerId)')
    .eq('id', id)
    .single();

  if (fetchError || !product) {
    throw createError('Product not found', 404);
  }

  // Verify ownership
  const storeOwner = (product.store as any)?.ownerId;
  if (storeOwner !== userId && userRole !== 'ADMIN') {
    throw createError('Not authorized to update this product', 403);
  }

  const updateData: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  const allowedFields = [
    'name', 'description', 'price', 'imageUrl', 'images',
    'category', 'stock', 'isActive'
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  const { data: updatedProduct, error } = await supabase
    .from('Product')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw createError('Failed to update product', 500);
  }

  res.json({
    success: true,
    message: 'Product updated successfully',
    data: updatedProduct,
  });
};

// Delete product
export const deleteProduct = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  // Check ownership
  const { data: product } = await supabase
    .from('Product')
    .select('store:Store!Product_storeId_fkey(ownerId)')
    .eq('id', id)
    .single();

  if (!product) {
    throw createError('Product not found', 404);
  }

  const storeOwner = (product.store as any)?.ownerId;
  if (storeOwner !== userId && userRole !== 'ADMIN') {
    throw createError('Not authorized to delete this product', 403);
  }

  // Delete from cart items first
  await supabase.from('CartItem').delete().eq('productId', id);

  const { error } = await supabase.from('Product').delete().eq('id', id);

  if (error) {
    throw createError('Failed to delete product', 500);
  }

  res.json({
    success: true,
    message: 'Product deleted successfully',
  });
};
