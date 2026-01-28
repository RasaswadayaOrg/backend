import { Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';

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
      supabase.from('Order').select('id, totalPrice', { count: 'exact' })
    ]);

    // Calculate total revenue
    let totalRevenue = 0;
    if (ordersResult.data) {
      totalRevenue = ordersResult.data.reduce((sum, order: any) => 
        sum + (parseFloat(order.totalPrice) || 0), 0
      );
    }

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
        totalRevenue
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
      price,
      imageUrl,
      category,
      stock,
      storeId
    } = req.body;

    // Logic to ensure storeId exists or default to something could be added here
    // For now we assume the frontend sends a valid storeId or we let the DB fail

    // Generate a unique ID for the product
    const productId = `prd-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const { data, error } = await supabase
      .from('Product')
      .insert({
        id: productId,
        name,
        description,
        price,
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
    throw createError('Failed to create product', 500);
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
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
        price,
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
        .select('id, totalPrice, status, createdAt, user:User!Order_userId_fkey(fullName)')
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
          target: `LKR ${Number(order.totalPrice).toLocaleString()}`,
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
    
    // Transform data if needed, but for now returning raw user objects
    // Be careful with password hashes if Supabase returns them (it shouldn't via standard select usually unless explicit, but good to be aware)
    
    res.json({
      success: true,
      data: data,
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

