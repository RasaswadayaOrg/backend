import { Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';

// Helper to generate unique event IDs
const generateEventId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `evt-${timestamp}-${random}`;
};

// Get all events with filters and pagination
export const getEvents = async (req: AuthRequest, res: Response) => {
  const {
    category,
    city,
    search,
    startDate,
    endDate,
    featured,
    page = 1,
    limit = 10,
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);

  let query = supabase
    .from('Event')
    .select('*, organizer:User!Event_organizerId_fkey(id, fullName)', { count: 'exact' });

  // Apply filters
  if (category) {
    query = query.eq('category', category);
  }

  if (city) {
    query = query.ilike('city', `%${city}%`);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  if (startDate) {
    query = query.gte('eventDate', startDate);
  }

  if (endDate) {
    query = query.lte('eventDate', endDate);
  }

  if (featured === 'true') {
    query = query.eq('isFeatured', true);
  }

  // Order by event date
  query = query.order('eventDate', { ascending: true });

  // Pagination
  query = query.range(offset, offset + Number(limit) - 1);

  const { data: events, error, count } = await query;

  if (error) {
    console.error('Fetch events error:', error);
    throw createError('Failed to fetch events', 500);
  }

  res.json({
    success: true,
    data: events,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: count || 0,
      totalPages: Math.ceil((count || 0) / Number(limit)),
    },
  });
};

// Get featured events
export const getFeaturedEvents = async (req: AuthRequest, res: Response) => {
  const { data: events, error } = await supabase
    .from('Event')
    .select('*, organizer:User!Event_organizerId_fkey(id, fullName)')
    .eq('isFeatured', true)
    .gte('eventDate', new Date().toISOString())
    .order('eventDate', { ascending: true })
    .limit(6);

  if (error) {
    throw createError('Failed to fetch featured events', 500);
  }

  res.json({
    success: true,
    data: events,
  });
};

// Get upcoming events
export const getUpcomingEvents = async (req: AuthRequest, res: Response) => {
  const limit = Number(req.query.limit) || 10;

  const { data: events, error } = await supabase
    .from('Event')
    .select('*, organizer:User!Event_organizerId_fkey(id, fullName)')
    .gte('eventDate', new Date().toISOString())
    .order('eventDate', { ascending: true })
    .limit(limit);

  if (error) {
    throw createError('Failed to fetch upcoming events', 500);
  }

  res.json({
    success: true,
    data: events,
  });
};

// Get event by ID
export const getEventById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const { data: event, error } = await supabase
    .from('Event')
    .select(`
      *,
      organizer:User!Event_organizerId_fkey(id, fullName, email),
      performances:Performance(
        id,
        role,
        artist:Artist(id, name, photoUrl, profession)
      )
    `)
    .eq('id', id)
    .single();

  if (error || !event) {
    throw createError('Event not found', 404);
  }

  // Check if user is interested (if authenticated)
  let isInterested = false;
  if (userId) {
    const { data: interest } = await supabase
      .from('Interest')
      .select('id')
      .eq('userId', userId)
      .eq('eventId', id)
      .single();
    isInterested = !!interest;
  }

  // Get interest count
  const { count: interestCount } = await supabase
    .from('Interest')
    .select('id', { count: 'exact' })
    .eq('eventId', id);

  res.json({
    success: true,
    data: {
      ...event,
      isInterested,
      interestCount: interestCount || 0,
    },
  });
};

// Create event
export const createEvent = async (req: AuthRequest, res: Response) => {
  const organizerId = req.user?.id;

  if (!organizerId) {
    throw createError('Authentication required', 401);
  }

  const {
    title,
    description,
    eventDate,
    endDate,
    startTime,
    endTime,
    location,
    venue,
    city,
    category,
    imageUrl,
    capacity,
    ticketLink,
    price,
    isFeatured,
    artistIds,
  } = req.body;

  // Validate event date is in the future
  const eventDateTime = new Date(eventDate);
  if (eventDateTime <= new Date()) {
    throw createError('Event date must be in the future', 400);
  }

  // Validate end date is after start date if provided
  if (endDate) {
    const endDateTime = new Date(endDate);
    if (endDateTime <= eventDateTime) {
      throw createError('End date must be after event date', 400);
    }
  }

  const eventId = generateEventId();

  const now = new Date().toISOString();

  const { data: event, error } = await supabase
    .from('Event')
    .insert({
      id: eventId,
      title,
      description,
      eventDate,
      endDate: endDate || null,
      startTime: startTime || null,
      endTime: endTime || null,
      location,
      venue,
      city,
      category,
      imageUrl: imageUrl || null,
      capacity: capacity ? Number(capacity) : null,
      ticketLink: ticketLink || null,
      price: price ? Number(price) : 0,
      isFeatured: isFeatured || false,
      organizerId,
      createdAt: now,
      updatedAt: now,
    })
    .select('*, organizer:User!Event_organizerId_fkey(id, fullName)')
    .single();

  if (error) {
    console.error('Create event error:', error);
    throw createError('Failed to create event', 500);
  }

  // Tag artists to the event via Performance records
  let taggedArtists: any[] = [];
  if (artistIds && Array.isArray(artistIds) && artistIds.length > 0) {
    const performanceRecords = artistIds.map((artistId: string) => ({
      artistId,
      eventId,
      role: null,
    }));

    const { data: performances, error: perfError } = await supabase
      .from('Performance')
      .insert(performanceRecords)
      .select('*, artist:Artist(id, name, profession, genre, photoUrl)');

    if (perfError) {
      console.error('Tag artists error:', perfError);
      // Event was created successfully, so we don't throw — just log
    } else {
      taggedArtists = (performances || []).map((p: any) => p.artist);
    }
  }

  res.status(201).json({
    success: true,
    message: 'Event created successfully',
    data: {
      ...event,
      taggedArtists,
    },
  });
};

// Update event
export const updateEvent = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId) {
    throw createError('Authentication required', 401);
  }

  // Check if event exists and user owns it
  const { data: existingEvent, error: fetchError } = await supabase
    .from('Event')
    .select('organizerId')
    .eq('id', id)
    .single();

  if (fetchError || !existingEvent) {
    throw createError('Event not found', 404);
  }

  // Only allow owner or admin to update
  if (existingEvent.organizerId !== userId && userRole !== 'ADMIN') {
    throw createError('Not authorized to update this event', 403);
  }

  const updateData: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  const allowedFields = [
    'title', 'description', 'eventDate', 'endDate', 'startTime', 'endTime',
    'location', 'venue', 'city', 'category', 'imageUrl',
    'capacity', 'ticketLink', 'price', 'isFeatured'
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  // Type-cast numeric fields
  if (updateData.capacity !== undefined) {
    updateData.capacity = updateData.capacity ? Number(updateData.capacity) : null;
  }
  if (updateData.price !== undefined) {
    updateData.price = Number(updateData.price) || 0;
  }

  const { data: event, error } = await supabase
    .from('Event')
    .update(updateData)
    .eq('id', id)
    .select('*, organizer:User!Event_organizerId_fkey(id, fullName)')
    .single();

  if (error) {
    console.error('Update event error:', error);
    throw createError('Failed to update event', 500);
  }

  res.json({
    success: true,
    message: 'Event updated successfully',
    data: event,
  });
};

// Delete event
export const deleteEvent = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId) {
    throw createError('Authentication required', 401);
  }

  // Check if event exists and user owns it
  const { data: existingEvent, error: fetchError } = await supabase
    .from('Event')
    .select('organizerId, title')
    .eq('id', id)
    .single();

  if (fetchError || !existingEvent) {
    throw createError('Event not found', 404);
  }

  // Only allow owner or admin to delete
  if (existingEvent.organizerId !== userId && userRole !== 'ADMIN') {
    throw createError('Not authorized to delete this event', 403);
  }

  // Delete related records first (cascade manually)
  const { error: interestError } = await supabase.from('Interest').delete().eq('eventId', id);
  if (interestError) {
    console.error('Delete interests error:', interestError);
  }

  const { error: performanceError } = await supabase.from('Performance').delete().eq('eventId', id);
  if (performanceError) {
    console.error('Delete performances error:', performanceError);
  }

  const { error: ticketError } = await supabase.from('Ticket').delete().eq('eventId', id);
  if (ticketError) {
    console.error('Delete tickets error:', ticketError);
  }

  const { error } = await supabase.from('Event').delete().eq('id', id);

  if (error) {
    console.error('Delete event error:', error);
    throw createError('Failed to delete event', 500);
  }

  res.json({
    success: true,
    message: `Event "${existingEvent.title}" deleted successfully`,
  });
};

// Express interest in event
export const expressInterest = async (req: AuthRequest, res: Response) => {
  const { id: eventId } = req.params;
  const userId = req.user?.id;

  // Check if event exists
  const { data: event, error: eventError } = await supabase
    .from('Event')
    .select('id')
    .eq('id', eventId)
    .single();

  if (eventError || !event) {
    throw createError('Event not found', 404);
  }

  // Check if already interested
  const { data: existingInterest } = await supabase
    .from('Interest')
    .select('id')
    .eq('userId', userId)
    .eq('eventId', eventId)
    .single();

  if (existingInterest) {
    throw createError('Already interested in this event', 400);
  }

  const { error } = await supabase.from('Interest').insert({
    userId,
    eventId,
  });

  if (error) {
    throw createError('Failed to express interest', 500);
  }

  res.json({
    success: true,
    message: 'Interest expressed successfully',
  });
};

// Remove interest from event
export const removeInterest = async (req: AuthRequest, res: Response) => {
  const { id: eventId } = req.params;
  const userId = req.user?.id;

  const { error } = await supabase
    .from('Interest')
    .delete()
    .eq('userId', userId)
    .eq('eventId', eventId);

  if (error) {
    throw createError('Failed to remove interest', 500);
  }

  res.json({
    success: true,
    message: 'Interest removed successfully',
  });
};

// Get user's interested events
export const getUserInterestedEvents = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  const { data: interests, error } = await supabase
    .from('Interest')
    .select(`
      id,
      createdAt,
      event:Event(*)
    `)
    .eq('userId', userId)
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('Fetch interested events error:', error);
    throw createError('Failed to fetch interested events', 500);
  }

  const events = interests?.map((i) => i.event) || [];

  res.json({
    success: true,
    data: events,
  });
};

// Get organizer's own events with pagination
export const getOrganizerEvents = async (req: AuthRequest, res: Response) => {
  const organizerId = req.user?.id;

  if (!organizerId) {
    throw createError('Authentication required', 401);
  }

  const { page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const { data: events, error, count } = await supabase
    .from('Event')
    .select('*, organizer:User!Event_organizerId_fkey(id, fullName)', { count: 'exact' })
    .eq('organizerId', organizerId)
    .order('createdAt', { ascending: false })
    .range(offset, offset + Number(limit) - 1);

  if (error) {
    console.error('Fetch organizer events error:', error);
    throw createError('Failed to fetch organizer events', 500);
  }

  res.json({
    success: true,
    data: events || [],
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: count || 0,
      totalPages: Math.ceil((count || 0) / Number(limit)),
    },
  });
};

// Upload event image
export const uploadImage = async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    throw createError('No image file provided', 400);
  }

  const imageUrl = `/uploads/events/${req.file.filename}`;

  res.json({
    success: true,
    message: 'Image uploaded successfully',
    data: {
      imageUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
    },
  });
};
