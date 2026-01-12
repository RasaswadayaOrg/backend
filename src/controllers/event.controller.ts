import { Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';

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
    price,
    capacity,
    ticketLink,
    isFeatured,
  } = req.body;

  const { data: event, error } = await supabase
    .from('Event')
    .insert({
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
      price: price || 0,
      capacity: capacity || null,
      ticketLink: ticketLink || null,
      isFeatured: isFeatured || false,
      organizerId,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Create event error:', error);
    throw createError('Failed to create event', 500);
  }

  res.status(201).json({
    success: true,
    message: 'Event created successfully',
    data: event,
  });
};

// Update event
export const updateEvent = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

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
    'location', 'venue', 'city', 'category', 'imageUrl', 'price',
    'capacity', 'ticketLink', 'isFeatured'
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  const { data: event, error } = await supabase
    .from('Event')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
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

  // Check if event exists and user owns it
  const { data: existingEvent, error: fetchError } = await supabase
    .from('Event')
    .select('organizerId')
    .eq('id', id)
    .single();

  if (fetchError || !existingEvent) {
    throw createError('Event not found', 404);
  }

  // Only allow owner or admin to delete
  if (existingEvent.organizerId !== userId && userRole !== 'ADMIN') {
    throw createError('Not authorized to delete this event', 403);
  }

  // Delete related records first
  await supabase.from('Interest').delete().eq('eventId', id);
  await supabase.from('Performance').delete().eq('eventId', id);
  await supabase.from('Ticket').delete().eq('eventId', id);

  const { error } = await supabase.from('Event').delete().eq('id', id);

  if (error) {
    throw createError('Failed to delete event', 500);
  }

  res.json({
    success: true,
    message: 'Event deleted successfully',
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
    throw createError('Failed to fetch interested events', 500);
  }

  const events = interests?.map((i) => i.event) || [];

  res.json({
    success: true,
    data: events,
  });
};
