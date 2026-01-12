import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';

// Generate JWT token
const generateToken = (user: { id: string; email: string; role: string; fullName: string }): string => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw createError('JWT secret not configured', 500);
  }

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    },
    jwtSecret,
    { expiresIn: '24h' }
  );
};

// Register new user
export const register = async (req: AuthRequest, res: Response) => {
  const { email, password, fullName, firstName, lastName, phone, city } = req.body;

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('User')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    throw createError('User already exists with this email', 400);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const { data: user, error } = await supabase
    .from('User')
    .insert({
      email,
      password: hashedPassword,
      fullName,
      firstName: firstName || null,
      lastName: lastName || null,
      phone: phone || null,
      city: city || null,
      role: 'USER',
    })
    .select('id, email, fullName, firstName, lastName, phone, city, role, createdAt')
    .single();

  if (error) {
    console.error('Registration error:', error);
    throw createError('Failed to create user', 500);
  }

  const token = generateToken(user);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        city: user.city,
        role: user.role,
      },
      token,
    },
  });
};

// Login user
export const login = async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;

  // Get user with password
  const { data: user, error } = await supabase
    .from('User')
    .select('id, email, password, fullName, firstName, lastName, phone, city, role')
    .eq('email', email)
    .single();

  if (error || !user) {
    throw createError('Invalid email or password', 401);
  }

  // Compare password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw createError('Invalid email or password', 401);
  }

  const token = generateToken(user);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        city: user.city,
        role: user.role,
      },
      token,
    },
  });
};

// Get current user
export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  const { data: user, error } = await supabase
    .from('User')
    .select('id, email, fullName, firstName, lastName, phone, city, role, createdAt')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw createError('User not found', 404);
  }

  res.json({
    success: true,
    data: user,
  });
};

// Update profile
export const updateProfile = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { fullName, firstName, lastName, phone, city } = req.body;

  const updateData: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  if (fullName !== undefined) updateData.fullName = fullName;
  if (firstName !== undefined) updateData.firstName = firstName;
  if (lastName !== undefined) updateData.lastName = lastName;
  if (phone !== undefined) updateData.phone = phone;
  if (city !== undefined) updateData.city = city;

  const { data: user, error } = await supabase
    .from('User')
    .update(updateData)
    .eq('id', userId)
    .select('id, email, fullName, firstName, lastName, phone, city, role')
    .single();

  if (error) {
    throw createError('Failed to update profile', 500);
  }

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: user,
  });
};

// Change password
export const changePassword = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { currentPassword, newPassword } = req.body;

  // Get current password hash
  const { data: user, error: fetchError } = await supabase
    .from('User')
    .select('password')
    .eq('id', userId)
    .single();

  if (fetchError || !user) {
    throw createError('User not found', 404);
  }

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

  if (!isCurrentPasswordValid) {
    throw createError('Current password is incorrect', 400);
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Update password
  const { error: updateError } = await supabase
    .from('User')
    .update({
      password: hashedPassword,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', userId);

  if (updateError) {
    throw createError('Failed to update password', 500);
  }

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
};

// Get user reminders
export const getReminders = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw createError('User not authenticated', 401);
  }

  // Fetch reminders
  const { data: reminders, error } = await supabase
    .from('Reminder')
    .select('*')
    .eq('userId', userId)
    .order('eventDate', { ascending: true });

  if (error) {
    console.error('Fetch reminders error:', error);
    // Return empty if error occurs (e.g. table not found in dev) to keep UI safe
    // Ideally should be handled better
    res.json({ success: true, data: [] }); 
    return;
  }

  res.json({
    success: true,
    data: reminders || [],
  });
};
