import { Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';

// Get all users (admin)
export const getUsers = async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20, role, search } = req.query;

  const offset = (Number(page) - 1) * Number(limit);

  let query = supabase
    .from('User')
    .select('id, email, fullName, firstName, lastName, phone, city, role, createdAt', { count: 'exact' });

  if (role) {
    query = query.eq('role', role);
  }

  if (search) {
    query = query.or(`fullName.ilike.%${search}%,email.ilike.%${search}%`);
  }

  query = query.order('createdAt', { ascending: false });
  query = query.range(offset, offset + Number(limit) - 1);

  const { data: users, error, count } = await query;

  if (error) {
    throw createError('Failed to fetch users', 500);
  }

  res.json({
    success: true,
    data: users,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: count || 0,
      totalPages: Math.ceil((count || 0) / Number(limit)),
    },
  });
};

// Get user by ID
export const getUserById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const { data: user, error } = await supabase
    .from('User')
    .select('id, email, fullName, firstName, lastName, phone, city, role, createdAt')
    .eq('id', id)
    .single();

  if (error || !user) {
    throw createError('User not found', 404);
  }

  res.json({
    success: true,
    data: user,
  });
};

// Update user role
export const updateUserRole = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  const validRoles = ['USER', 'ARTIST', 'ORGANIZER', 'STORE_OWNER', 'ADMIN'];
  if (!validRoles.includes(role)) {
    throw createError('Invalid role', 400);
  }

  const { data: user, error } = await supabase
    .from('User')
    .update({
      role,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, email, fullName, role')
    .single();

  if (error) {
    throw createError('Failed to update user role', 500);
  }

  res.json({
    success: true,
    message: 'User role updated',
    data: user,
  });
};

// Delete user
export const deleteUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const currentUserId = req.user?.id;

  // Prevent self-deletion
  if (id === currentUserId) {
    throw createError('Cannot delete your own account', 400);
  }

  // Delete related data
  await supabase.from('CartItem').delete().eq('userId', id);
  await supabase.from('Interest').delete().eq('userId', id);
  await supabase.from('Follower').delete().eq('userId', id);
  await supabase.from('Enquiry').delete().eq('userId', id);
  await supabase.from('Reminder').delete().eq('userId', id);

  // Note: Orders, tickets, etc. might need to be handled differently (soft delete or preserve)

  const { error } = await supabase.from('User').delete().eq('id', id);

  if (error) {
    throw createError('Failed to delete user', 500);
  }

  res.json({
    success: true,
    message: 'User deleted successfully',
  });
};
