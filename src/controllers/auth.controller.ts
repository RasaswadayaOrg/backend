import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '../lib/db';

// Supabase Auth client (with service role for admin operations)
const supabaseAuth = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!
);

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
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw createError('User already exists with this email', 400);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  try {
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        city: city || null,
        role: 'USER',
      },
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
      },
    });

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
  } catch (error) {
    console.error('Registration error:', error);
    throw createError('Failed to create user', 500);
  }
};

// Login user
export const login = async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;

  // Get user with password
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
      fullName: true,
      firstName: true,
      lastName: true,
      phone: true,
      city: true,
      role: true,
      interests: true,
      preferences: true,
    },
  });

  if (!user) {
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
        interests: user.interests,
        preferences: user.preferences,
      },
      token,
    },
  });
};

// Get current user
export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
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
      interests: true, // Fetch related interests
      preferences: true, // Fetch related user preferences
    },
  });

  if (!user) {
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

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: fullName !== undefined ? fullName : undefined,
        firstName: firstName !== undefined ? firstName : undefined,
        lastName: lastName !== undefined ? lastName : undefined,
        phone: phone !== undefined ? phone : undefined,
        city: city !== undefined ? city : undefined,
        updatedAt: new Date().toISOString(),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        firstName: true,
        lastName: true,
        phone: true,
        city: true,
        role: true,
        interests: true,
        preferences: true,
      },
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    throw createError('Failed to update profile', 500);
  }
};

// Change password
export const changePassword = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { currentPassword, newPassword } = req.body;

  // Get current password hash
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  if (!user) {
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
  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      updatedAt: new Date().toISOString(),
    },
  });

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

  try {
    // Fetch reminders
    const reminders = await prisma.reminder.findMany({
      where: { userId },
      orderBy: { eventDate: 'asc' },
    });

    res.json({
      success: true,
      data: reminders || [],
    });
  } catch (error) {
    console.error('Fetch reminders error:', error);
    res.json({ success: true, data: [] });
  }
};

// Google OAuth - sync with Supabase auth
export const googleAuth = async (req: AuthRequest, res: Response) => {
  const { accessToken, refreshToken } = req.body;

  if (!accessToken) {
    throw createError('Access token is required', 400);
  }

  try {
    // Verify the token with Supabase and get user info
    const { data: supabaseUser, error: supabaseError } = await supabase.auth.getUser(accessToken);

    if (supabaseError || !supabaseUser?.user) {
      console.error('Supabase auth error:', supabaseError);
      throw createError('Invalid access token', 401);
    }

    const { user: authUser } = supabaseUser;
    const email = authUser.email;
    const fullName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || email?.split('@')[0] || 'User';
    const avatarUrl = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;

    if (!email) {
      throw createError('Email not found in Google account', 400);
    }

    // Check if user already exists in our database
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        interests: true,
        preferences: true,
      },
    });

    if (user) {
      // Update existing user with latest info from Google
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          fullName: user.fullName || fullName,
          avatarUrl: avatarUrl || user.avatarUrl,
        },
        include: {
          interests: true,
          preferences: true,
        },
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          fullName,
          avatarUrl,
          password: '', // No password for OAuth users
          role: 'USER',
        },
        include: {
          interests: true,
          preferences: true,
        },
      });
    }

    // Generate our own JWT token
    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Google authentication successful',
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
          avatarUrl: user.avatarUrl,
          interests: user.interests,
          preferences: user.preferences,
        },
        token,
      },
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    if (error.statusCode) {
      throw error;
    }
    throw createError('Google authentication failed: ' + (error.message || 'Unknown error'), 500);
  }
};

// Save user preferences (categories and interests)
export const savePreferences = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { city, categories, interests } = req.body;

  if (!userId) {
    throw createError('User not authenticated', 401);
  }

  try {
    // Update user's city if provided
    if (city) {
        await prisma.user.update({
            where: { id: userId },
            data: { 
                city,
                updatedAt: new Date().toISOString() 
            },
        });
    }

    // Check if preferences already exist for this user
    const existingPrefs = await prisma.userPreference.findUnique({
        where: { userId },
    });

    let prefs;

    if (existingPrefs) {
      // Update existing preferences
      prefs = await prisma.userPreference.update({
        where: { userId },
        data: {
          categories: categories || [],
          interests: interests || [],
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new preferences
      prefs = await prisma.userPreference.create({
        data: {
          userId,
          categories: categories || [],
          interests: interests || [],
        },
      });
    }

    res.json({
      success: true,
      message: 'Preferences saved successfully',
      data: prefs,
    });
  } catch (error: any) {
    console.error('Save preferences error:', error);
    if (error.statusCode) {
      throw error;
    }
    throw createError('Failed to save preferences', 500);
  }
};

// Get user preferences
export const getPreferences = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw createError('User not authenticated', 401);
  }

  try {
    const prefs = await prisma.userPreference.findUnique({
      where: { userId },
    });

    res.json({
      success: true,
      data: prefs || { categories: [], interests: [] },
    });
  } catch (error: any) {
    console.error('Get preferences error:', error);
    throw createError('Failed to fetch preferences', 500);
  }
};
