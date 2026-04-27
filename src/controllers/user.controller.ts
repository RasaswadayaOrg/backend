import { Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';
import { prisma } from '../lib/db';

// Get all users (admin)
export const getUsers = async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20, role, search } = req.query;

  const offset = (Number(page) - 1) * Number(limit);

  try {
    // Build where clause for Prisma
    const where: any = {};

    if (role && role !== 'ALL') {
      where.role = role as string;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Fetch users with their role applications using Prisma
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          firstName: true,
          lastName: true,
          phone: true,
          city: true,
          role: true,
          createdAt: true,
          RoleRequest: {
            select: {
              id: true,
              requestedRole: true,
              status: true,
              reason: true,
              textFields: true,
              documents: true,
              rejectionReason: true,
              requestedAt: true,
              updatedAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: offset,
        take: Number(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    throw createError('Failed to fetch users', 500);
  }
};

// Get user by ID
export const getUserById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = Array.isArray(id) ? id[0] : id;
  // Fetch basic user record from Supabase
  const { data: user, error } = await supabase
    .from('User')
    .select('id, email, fullName, firstName, lastName, phone, city, avatarUrl, role, createdAt')
    .eq('id', id)
    .single();

  if (error || !user) {
    throw createError('User not found', 404);
  }

  try {
    // Fetch related details from Supabase
    const [{ data: artistProfile }, { data: orders }, { data: preferences }] = await Promise.all([
  supabase.from('Artist').select('*').eq('userId', userId).maybeSingle(),
  supabase.from('Order').select('id,totalAmount,status,createdAt').eq('userId', userId).order('createdAt', { ascending: false }).limit(20),
  supabase.from('UserPreference').select('*').eq('userId', userId).maybeSingle(),
    ]);

    // Fetch role requests using Prisma (more detailed fields)
    const roleRequests = await prisma.roleRequest.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        requestedRole: true,
        reason: true,
        textFields: true,
        documents: true,
        status: true,
        rejectionReason: true,
        requestedAt: true,
        updatedAt: true,
      }
    });

    // Transform role requests to match frontend expectations
    const roleApplications = roleRequests.map((req: any) => ({
      id: req.id,
      role: req.requestedRole,
      bio: req.reason,
      portfolioUrl: req.textFields ? JSON.stringify(req.textFields) : null,
      proofDocumentUrl: req.documents ? JSON.stringify(req.documents) : null,
      status: req.status,
      notes: req.rejectionReason,
      createdAt: req.requestedAt,
      updatedAt: req.updatedAt,
    }));

    res.json({
      success: true,
      data: {
        user,
        artistProfile: artistProfile || null,
        orders: orders || [],
        preferences: preferences || null,
        roleApplications,
      }
    });
  } catch (err) {
    console.error('Error fetching user details:', err);
    throw createError('Failed to fetch user details', 500);
  }
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
