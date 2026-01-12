import { Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';

// Get all stores
export const getStores = async (req: AuthRequest, res: Response) => {
  const { search, page = 1, limit = 10 } = req.query;

  const offset = (Number(page) - 1) * Number(limit);

  let query = supabase
    .from('Store')
    .select('*, owner:User!Store_ownerId_fkey(id, fullName)', { count: 'exact' });

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  query = query.order('rating', { ascending: false });
  query = query.range(offset, offset + Number(limit) - 1);

  const { data: stores, error, count } = await query;

  if (error) {
    throw createError('Failed to fetch stores', 500);
  }

  res.json({
    success: true,
    data: stores,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: count || 0,
      totalPages: Math.ceil((count || 0) / Number(limit)),
    },
  });
};

// Get store by ID
export const getStoreById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const { data: store, error } = await supabase
    .from('Store')
    .select(`
      *,
      owner:User!Store_ownerId_fkey(id, fullName, email),
      products:Product(*)
    `)
    .eq('id', id)
    .single();

  if (error || !store) {
    throw createError('Store not found', 404);
  }

  res.json({
    success: true,
    data: store,
  });
};

// Create store
export const createStore = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { name, description, imageUrl, coverUrl, location } = req.body;

  // Check if user already has a store
  const { data: existingStore } = await supabase
    .from('Store')
    .select('id')
    .eq('ownerId', userId)
    .single();

  if (existingStore) {
    throw createError('You already have a store', 400);
  }

  const { data: store, error } = await supabase
    .from('Store')
    .insert({
      name,
      description: description || null,
      imageUrl: imageUrl || null,
      coverUrl: coverUrl || null,
      location: location || null,
      ownerId: userId,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Create store error:', error);
    throw createError('Failed to create store', 500);
  }

  // Update user role to STORE_OWNER
  await supabase
    .from('User')
    .update({ role: 'STORE_OWNER' })
    .eq('id', userId);

  res.status(201).json({
    success: true,
    message: 'Store created successfully',
    data: store,
  });
};

// Update store
export const updateStore = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  // Check ownership
  const { data: store, error: fetchError } = await supabase
    .from('Store')
    .select('ownerId')
    .eq('id', id)
    .single();

  if (fetchError || !store) {
    throw createError('Store not found', 404);
  }

  if (store.ownerId !== userId && userRole !== 'ADMIN') {
    throw createError('Not authorized to update this store', 403);
  }

  const updateData: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  const allowedFields = ['name', 'description', 'imageUrl', 'coverUrl', 'location'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  const { data: updatedStore, error } = await supabase
    .from('Store')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw createError('Failed to update store', 500);
  }

  res.json({
    success: true,
    message: 'Store updated successfully',
    data: updatedStore,
  });
};

// Delete store
export const deleteStore = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  // Check ownership
  const { data: store } = await supabase
    .from('Store')
    .select('ownerId')
    .eq('id', id)
    .single();

  if (!store) {
    throw createError('Store not found', 404);
  }

  if (store.ownerId !== userId && userRole !== 'ADMIN') {
    throw createError('Not authorized to delete this store', 403);
  }

  // Delete related products first
  await supabase.from('Product').delete().eq('storeId', id);

  const { error } = await supabase.from('Store').delete().eq('id', id);

  if (error) {
    throw createError('Failed to delete store', 500);
  }

  res.json({
    success: true,
    message: 'Store deleted successfully',
  });
};

// Get store products
export const getStoreProducts = async (req: AuthRequest, res: Response) => {
  const { id: storeId } = req.params;

  const { data: products, error } = await supabase
    .from('Product')
    .select('*')
    .eq('storeId', storeId)
    .eq('isActive', true)
    .order('createdAt', { ascending: false });

  if (error) {
    throw createError('Failed to fetch products', 500);
  }

  res.json({
    success: true,
    data: products,
  });
};

// Get user's store
export const getMyStore = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  const { data: store, error } = await supabase
    .from('Store')
    .select(`
      *,
      products:Product(*)
    `)
    .eq('ownerId', userId)
    .single();

  if (error) {
    // User doesn't have a store yet
    return res.json({
      success: true,
      data: null,
    });
  }

  res.json({
    success: true,
    data: store,
  });
};
