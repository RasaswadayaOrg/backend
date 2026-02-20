import { Response } from 'express';
import { supabase } from '../lib/supabase';
import { prisma } from '../lib/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';
import bcrypt from 'bcryptjs';

// Get admin dashboard stats (public - for admin panel use)
export const getAdminStats = async (req: AuthRequest, res: Response) => {
  try {
    // Fetch counts in parallel
    const [
      usersResult,
      eventsResult,
      artistsResult,
      productsResult,
      academiesResult,
      storesResult,
      ordersResult
    ] = await Promise.all([
      supabase.from('User').select('id', { count: 'exact', head: true }),
      supabase.from('Event').select('id', { count: 'exact', head: true }),
      supabase.from('Artist').select('id', { count: 'exact', head: true }),
      supabase.from('Product').select('id', { count: 'exact', head: true }),
      supabase.from('Academy').select('id', { count: 'exact', head: true }),
      supabase.from('Store').select('id', { count: 'exact', head: true }),
      supabase.from('Order').select('id', { count: 'exact', head: true })
    ]);

    res.json({
      success: true,
      data: {
        totalUsers: usersResult.count || 0,
        totalEvents: eventsResult.count || 0,
        totalArtists: artistsResult.count || 0,
        totalProducts: productsResult.count || 0,
        totalAcademies: academiesResult.count || 0,
        totalStores: storesResult.count || 0,
        totalOrders: ordersResult.count || 0,
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    throw createError('Failed to fetch admin stats', 500);
  }
};

// Get all orders for admin
export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

    let query = supabase
      .from('Order')
      .select('*, user:User!Order_userId_fkey(fullName, email)', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, count, error } = await query
      .order('createdAt', { ascending: false })
      .range(skip, skip + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    throw createError('Failed to fetch admin orders', 500);
  }
};

// --- Artist Management ---

export const createArtist = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      profession,
      genre,
      bio,
      photoUrl,
      coverUrl,
      location,
      website,
      instagram,
      facebook,
    } = req.body;

    // Generate a unique ID for the artist
    const artistId = `art-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const { data, error } = await supabase
      .from('Artist')
      .insert({
        id: artistId,
        name,
        profession,
        genre,
        bio,
        photoUrl,
        coverUrl,
        location,
        website,
        instagram,
        facebook,
        userId: null, // Admin created artists have no user initially
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data,
      message: 'Artist created successfully'
    });
  } catch (error) {
    console.error('Create artist error:', error);
    throw createError('Failed to create artist', 500);
  }
};

export const updateArtist = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      profession,
      genre,
      bio,
      photoUrl,
      coverUrl,
      location,
      website,
      instagram,
      facebook,
    } = req.body;

    const { data, error } = await supabase
      .from('Artist')
      .update({
        name,
        profession,
        genre,
        bio,
        photoUrl,
        coverUrl,
        location,
        website,
        instagram,
        facebook,
        updatedAt: new Date(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data,
      message: 'Artist updated successfully'
    });
  } catch (error) {
    console.error('Update artist error:', error);
    throw createError('Failed to update artist', 500);
  }
};

export const deleteArtist = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Delete related data first (Manual Cascade)
    await supabase.from('Performance').delete().eq('artistId', id);
    await supabase.from('Follower').delete().eq('artistId', id);

    const { error } = await supabase
      .from('Artist')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Artist deleted successfully'
    });
  } catch (error) {
    console.error('Delete artist error:', error);
    throw createError('Failed to delete artist', 500);
  }
};

// --- Event Management ---

export const createEvent = async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      description,
      eventDate,
      location,
      venue,
      city,
      category,
      imageUrl,
      capacity,
      ticketLink,
      organizerId
    } = req.body;

    // Use provided organizerId or fall back to admin user
    let eventOrganizerId = organizerId;
    if (!eventOrganizerId) {
      // Find an admin user to use as organizer
      const { data: adminUser } = await supabase
        .from('User')
        .select('id')
        .eq('role', 'ADMIN')
        .limit(1)
        .single();
      
      eventOrganizerId = adminUser?.id;
    }

    if (!eventOrganizerId) {
      throw createError('No organizer available. Please create an admin user first.', 400);
    }

    // Generate a unique ID for the event
    const eventId = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const { data, error } = await supabase
      .from('Event')
      .insert({
        id: eventId,
        title,
        description,
        eventDate,
        location: location || 'TBD',
        venue: venue || 'TBD',
        city: city || 'TBD',
        category: category || 'General',
        imageUrl,
        capacity,
        ticketLink,
        organizerId: eventOrganizerId,
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    res.status(201).json({
      success: true,
      data,
      message: 'Event created successfully'
    });
  } catch (error: any) {
    console.error('Create event error:', error?.message || error);
    throw createError(error?.message || 'Failed to create event', 500);
  }
};

export const updateEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      eventDate,
      location,
      venue,
      city,
      category,
      imageUrl,
      capacity,
      ticketLink,
      isFeatured
    } = req.body;

    const { data, error } = await supabase
      .from('Event')
      .update({
        title,
        description,
        eventDate,
        location,
        venue,
        city,
        category,
        imageUrl,
        capacity,
        ticketLink,
        isFeatured,
        updatedAt: new Date(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data,
      message: 'Event updated successfully'
    });
  } catch (error) {
    console.error('Update event error:', error);
    throw createError('Failed to update event', 500);
  }
};

export const deleteEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('Event')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    throw createError('Failed to delete event', 500);
  }
};

// --- Academy Management ---

export const createAcademy = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      type,
      location,
      description,
      imageUrl,
      phone,
      email,
      website
    } = req.body;

    // Generate a unique ID for the academy
    const academyId = `acd-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const { data, error } = await supabase
      .from('Academy')
      .insert({
        id: academyId,
        name,
        type,
        location,
        description,
        imageUrl,
        phone,
        email,
        website,
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data,
      message: 'Academy created successfully'
    });
  } catch (error) {
    console.error('Create academy error:', error);
    throw createError('Failed to create academy', 500);
  }
};

export const updateAcademy = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      location,
      description,
      imageUrl,
      phone,
      email,
      website
    } = req.body;

    const { data, error } = await supabase
      .from('Academy')
      .update({
        name,
        type,
        location,
        description,
        imageUrl,
        phone,
        email,
        website,
        updatedAt: new Date(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data,
      message: 'Academy updated successfully'
    });
  } catch (error) {
    console.error('Update academy error:', error);
    throw createError('Failed to update academy', 500);
  }
};

export const deleteAcademy = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('Academy')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Academy deleted successfully'
    });
  } catch (error) {
    console.error('Delete academy error:', error);
    throw createError('Failed to delete academy', 500);
  }
};

// --- Product Management ---

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      description,
      imageUrl,
      category,
      stock,
      storeId
    } = req.body;

    // Validate that storeId is provided
    if (!storeId) {
      throw createError('Store ID is required to create a product', 400);
    }

    // Check if the store exists
    const { data: storeExists, error: storeError } = await supabase
      .from('Store')
      .select('id')
      .eq('id', storeId)
      .single();

    console.log('🔍 Store validation:', { 
      storeId, 
      storeExists, 
      storeError: storeError?.message,
      storeErrorCode: storeError?.code 
    });

    if (storeError || !storeExists) {
      // If error is PGRST116, it means no rows found
      if (storeError?.code === 'PGRST116') {
        throw createError(`Store with ID '${storeId}' not found. Please create a store first or use a valid store ID.`, 404);
      }
      
      if (storeError) {
        console.error('Store validation error:', storeError);
        throw createError(`Error validating store: ${storeError.message}`, 500);
      }
      
      throw createError(`Store with ID '${storeId}' not found. Please create a store first or use a valid store ID.`, 404);
    }

    // Generate a unique ID for the product
    const productId = `prd-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const { data, error } = await supabase
      .from('Product')
      .insert({
        id: productId,
        name,
        description,
        imageUrl,
        category,
        stock,
        storeId, 
        isActive: true,
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data,
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Create product error:', error);
    
    // Handle specific error cases
    if (error instanceof Error && 'statusCode' in error) {
      throw error; // Re-throw custom errors
    }
    
    throw createError('Failed to create product', 500);
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      imageUrl,
      category,
      stock,
      isActive
    } = req.body;

    const { data, error } = await supabase
      .from('Product')
      .update({
        name,
        description,
        imageUrl,
        category,
        stock,
        isActive,
        updatedAt: new Date(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Update product error:', error);
    throw createError('Failed to update product', 500);
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('Product')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    throw createError('Failed to delete product', 500);
  }
};

// Get recent activity for admin dashboard
export const getRecentActivity = async (req: AuthRequest, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 10;

    // Fetch recent data from multiple sources
    const [recentOrders, recentUsers, recentEvents] = await Promise.all([
      supabase
        .from('Order')
        .select('id, status, createdAt, user:User!Order_userId_fkey(fullName)')
        .order('createdAt', { ascending: false })
        .limit(5),
      supabase
        .from('User')
        .select('id, fullName, email, role, createdAt')
        .order('createdAt', { ascending: false })
        .limit(5),
      supabase
        .from('Event')
        .select('id, title, createdAt, organizer:User!Event_organizerId_fkey(fullName)')
        .order('createdAt', { ascending: false })
        .limit(5)
    ]);

    const activities: any[] = [];

    // Add order activities
    if (recentOrders.data) {
      recentOrders.data.forEach((order: any) => {
        activities.push({
          id: `order-${order.id}`,
          type: 'order',
          user: order.user?.fullName || 'Customer',
          action: 'placed an order',
          target: `Order #${order.id.substring(0, 8)}`,
          time: order.createdAt,
          status: order.status
        });
      });
    }

    // Add user registration activities
    if (recentUsers.data) {
      recentUsers.data.forEach((user: any) => {
        activities.push({
          id: `user-${user.id}`,
          type: 'user',
          user: user.fullName || user.email,
          action: 'registered as',
          target: user.role || 'User',
          time: user.createdAt
        });
      });
    }

    // Add event activities
    if (recentEvents.data) {
      recentEvents.data.forEach((event: any) => {
        activities.push({
          id: `event-${event.id}`,
          type: 'event',
          user: event.organizer?.fullName || 'Organizer',
          action: 'created event',
          target: event.title,
          time: event.createdAt
        });
      });
    }

    // Sort by time and return limited results
    const sortedActivities = activities
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, limit);

    res.json({
      success: true,
      data: sortedActivities
    });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    throw createError('Failed to fetch recent activity', 500);
  }
};

// Get all users (admin)
export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const role = req.query.role as string;
    
    let query = supabase
      .from('User')
      .select('*', { count: 'exact' });
      
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (role && role !== 'ALL') {
      query = query.eq('role', role);
    }
    
    const { data, error, count } = await query
      .range(skip, skip + limit - 1)
      .order('createdAt', { ascending: false });
      
    if (error) throw error;
    
    // Fetch pending role requests for all users
    const userIds = data?.map((user: any) => user.id) || [];
    const pendingRequests = await prisma.roleRequest.findMany({
      where: {
        userId: { in: userIds },
        status: 'PENDING'
      },
      select: {
        userId: true,
        requestedRole: true,
        requestedAt: true,
        id: true
      }
    });

    // Create a map of userId to pending requests
    const pendingRequestsMap = new Map();
    pendingRequests.forEach((req: any) => {
      if (!pendingRequestsMap.has(req.userId)) {
        pendingRequestsMap.set(req.userId, []);
      }
      pendingRequestsMap.get(req.userId).push({
        id: req.id,
        role: req.requestedRole,
        createdAt: req.requestedAt
      });
    });

    // Enhance user data with pending request info
    const enhancedData = data?.map((user: any) => ({
      ...user,
      pendingApplications: pendingRequestsMap.get(user.id) || [],
      hasPendingApplication: pendingRequestsMap.has(user.id)
    }));

    // Sort users with pending applications at the top
    const sortedData = enhancedData?.sort((a: any, b: any) => {
      if (a.hasPendingApplication && !b.hasPendingApplication) return -1;
      if (!a.hasPendingApplication && b.hasPendingApplication) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    res.json({
      success: true,
      data: sortedData,
      pagination: {
        total: count || 0,
        page,
        limit,
        pages: count ? Math.ceil(count / limit) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json(createError('Failed to fetch users'));
  }
};

// Update user role (admin)
export const updateUserRole = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  try {
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

    if (error) throw error;

    res.json({
      success: true,
      message: 'User role updated',
      data: user,
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json(createError('Failed to update user role'));
  }
};

// Delete user (admin)
export const deleteUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  try {
    // Delete related data first to avoid foreign key constraints if cascade isn't set up
    // Although typically Prisma/DB should handle this, manual cleanup is safer if schema is loose
    await supabase.from('CartItem').delete().eq('userId', id);
    // Add other related cleanups if necessary

    const { error } = await supabase.from('User').delete().eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json(createError('Failed to delete user'));
  }
};

// Get pending role requests count (admin)
export const getPendingApplicationsCount = async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.roleRequest.count({
      where: {
        status: 'PENDING'
      }
    });

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Error fetching pending requests count:', error);
    res.status(500).json(createError('Failed to fetch pending requests count'));
  }
};

// Get all stores (for dropdown/selection when creating products)
export const getAllStores = async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('Store')
      .select(`
        id,
        name,
        description,
        imageUrl,
        location,
        rating,
        ownerId,
        owner:User!Store_ownerId_fkey(id, fullName, email)
      `)
      .order('createdAt', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      message: `Found ${data?.length || 0} stores`
    });
  } catch (error) {
    console.error('Get stores error:', error);
    throw createError('Failed to fetch stores', 500);
  }
};

// Create a new store (admin)
export const createStore = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      description,
      imageUrl,
      coverUrl,
      location,
      ownerId
    } = req.body;

    // Validate required fields
    if (!name) {
      throw createError('Store name is required', 400);
    }

    if (!ownerId) {
      throw createError('Owner ID is required', 400);
    }

    // Check if owner exists
    const { data: ownerExists, error: ownerError } = await supabase
      .from('User')
      .select('id, role')
      .eq('id', ownerId)
      .single();

    if (ownerError || !ownerExists) {
      throw createError(`User with ID '${ownerId}' not found`, 404);
    }

    // Generate a unique ID for the store
    const storeId = `str-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const { data, error } = await supabase
      .from('Store')
      .insert({
        id: storeId,
        name,
        description,
        imageUrl,
        coverUrl,
        location,
        ownerId,
        rating: 0,
        reviewCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select(`
        id,
        name,
        description,
        imageUrl,
        coverUrl,
        location,
        rating,
        reviewCount,
        ownerId,
        owner:User!Store_ownerId_fkey(id, fullName, email)
      `)
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data,
      message: 'Store created successfully'
    });
  } catch (error) {
    console.error('Create store error:', error);
    
    // Handle specific error cases
    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }
    
    throw createError('Failed to create store', 500);
  }
};

// Update store (admin)
export const updateStore = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      imageUrl,
      coverUrl,
      location
    } = req.body;

    const { data, error } = await supabase
      .from('Store')
      .update({
        name,
        description,
        imageUrl,
        coverUrl,
        location,
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        id,
        name,
        description,
        imageUrl,
        coverUrl,
        location,
        rating,
        ownerId,
        owner:User!Store_ownerId_fkey(id, fullName, email)
      `)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data,
      message: 'Store updated successfully'
    });
  } catch (error) {
    console.error('Update store error:', error);
    throw createError('Failed to update store', 500);
  }
};

// Delete store (admin)
export const deleteStore = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if store has products
    const { data: products, error: productsError } = await supabase
      .from('Product')
      .select('id')
      .eq('storeId', id)
      .limit(1);

    if (productsError) throw productsError;

    if (products && products.length > 0) {
      throw createError('Cannot delete store with existing products. Please delete or reassign products first.', 400);
    }

    const { error } = await supabase
      .from('Store')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Store deleted successfully'
    });
  } catch (error) {
    console.error('Delete store error:', error);
    
    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }
    
    throw createError('Failed to delete store', 500);
  }
};

// Get user by ID with role requests
export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId || typeof userId !== 'string') {
      throw createError('Valid User ID is required', 400);
    }

    // Fetch user with role requests
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        RoleRequest: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Transform RoleRequest to match frontend expectations
    const transformedUser = {
      ...user,
      roleApplications: user.RoleRequest?.map((req: any) => ({
        id: req.id,
        role: req.requestedRole,
        status: req.status,
        bio: req.reason,
        portfolioUrl: req.textFields ? JSON.stringify(req.textFields) : null,
        proofDocumentUrl: req.documents ? JSON.stringify(req.documents) : null,
        notes: req.rejectionReason || null,
        createdAt: req.requestedAt,
        updatedAt: req.updatedAt
      })) || []
    };

    // Remove the RoleRequest property from response
    const { RoleRequest, ...userResponse } = transformedUser;

    res.json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    
    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }
    
    throw createError('Failed to fetch user details', 500);
  }
};

// --- Organizer Management ---

export const createOrganizer = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, fullName, phone, city, avatarUrl, bio } = req.body;
    
    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        phone,
        city,
        avatarUrl,
        role: 'ORGANIZER'
      }
    });

    res.status(201).json({ success: true, data: user });
  } catch (error: any) {
    console.error('Create organizer error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create organizer' });
  }
};

export const updateOrganizer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, phone, city, avatarUrl, bio } = req.body;
    
    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { id: id as string } });
    if (!existing) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = await prisma.user.update({
      where: { id: id as string },
      data: {
        fullName,
        phone,
        city,
        avatarUrl
      }
    });

    res.json({ success: true, data: user });
  } catch (error: any) {
    console.error('Update organizer error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update organizer' });
  }
};

// --- Post Management ---

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

export const getAllPosts = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Get posts with artist info using Prisma
    const [posts, total] = await Promise.all([
      (prisma as any).post.findMany({
        include: {
          artist: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      (prisma as any).post.count(),
    ]);

    // Transform posts with proper image URLs and counts
    const postsWithCounts = posts.map((post: any) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      imageUrl: post.imageUrl?.startsWith('http') 
        ? post.imageUrl 
        : post.imageUrl ? `${API_BASE_URL}${post.imageUrl}` : null,
      videoUrl: post.videoUrl,
      source: post.source,
      externalId: post.externalId,
      publishedAt: post.publishedAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      artistId: post.artistId,
      artist: post.artist,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
    }));

    res.json({
      success: true,
      data: {
        posts: postsWithCounts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all posts error:', error);
    throw createError('Failed to fetch posts', 500);
  }
};

export const getPostById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const post = await (prisma as any).post.findUnique({
      where: { id },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
        comments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            createdAt: true,
            userId: true,
          },
        },
      },
    });

    if (!post) {
      throw createError('Post not found', 404);
    }

    res.json({
      success: true,
      data: {
        id: post.id,
        title: post.title,
        content: post.content,
        imageUrl: post.imageUrl?.startsWith('http') 
          ? post.imageUrl 
          : post.imageUrl ? `${API_BASE_URL}${post.imageUrl}` : null,
        videoUrl: post.videoUrl,
        source: post.source,
        externalId: post.externalId,
        publishedAt: post.publishedAt,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        artistId: post.artistId,
        artist: post.artist,
        likesCount: post._count.likes,
        commentsCount: post._count.comments,
        recentComments: post.comments,
      }
    });
  } catch (error) {
    console.error('Get post by ID error:', error);
    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }
    throw createError('Failed to fetch post', 500);
  }
};

export const updatePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, imageUrl, videoUrl } = req.body;

    // Check if post exists
    const existingPost = await (prisma as any).post.findUnique({
      where: { id },
    });

    if (!existingPost) {
      throw createError('Post not found', 404);
    }

    const updatedPost = await (prisma as any).post.update({
      where: { id },
      data: {
        title,
        content,
        imageUrl,
        videoUrl,
      },
    });

    res.json({
      success: true,
      data: updatedPost,
      message: 'Post updated successfully'
    });
  } catch (error) {
    console.error('Update post error:', error);
    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }
    throw createError('Failed to update post', 500);
  }
};

export const deletePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if post exists
    const existingPost = await (prisma as any).post.findUnique({
      where: { id },
    });

    if (!existingPost) {
      throw createError('Post not found', 404);
    }

    // Delete the post (cascade will handle likes and comments)
    await (prisma as any).post.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }
    throw createError('Failed to delete post', 500);
  }
};

