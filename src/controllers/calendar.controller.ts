import { Response } from 'express';
import { prisma } from '../lib/db';
import { createError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * GET /api/artists/:artistId/calendar?month=3&year=2026
 * Fetch all calendar events for an artist in a given month.
 * Public — organizers can view artist schedules.
 */
export const getCalendarEvents = async (req: AuthRequest, res: Response) => {
  const artistId = req.params.artistId as string;
  const month = parseInt(req.query.month as string);
  const year = parseInt(req.query.year as string);

  // Validate artist exists
  const artist = await (prisma as any).artist.findUnique({
    where: { id: artistId },
    select: { id: true },
  });

  if (!artist) {
    throw createError('Artist not found', 404);
  }

  // Build date range filter
  let where: any = { artistId };

  if (!isNaN(month) && !isNaN(year)) {
    // Filter by specific month (1-indexed month)
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    where.eventDate = {
      gte: startDate,
      lte: endDate,
    };
  }

  const events = await (prisma as any).artistEvent.findMany({
    where,
    orderBy: { eventDate: 'asc' },
  });

  res.json(events);
};

/**
 * POST /api/artists/:artistId/calendar
 * Create a new calendar event for the artist.
 */
export const createCalendarEvent = async (req: AuthRequest, res: Response) => {
  const artistId = req.params.artistId as string;
  const userId = req.user?.id;

  if (!userId) {
    throw createError('Unauthorized', 401);
  }

  // Verify artist ownership
  const artist = await (prisma as any).artist.findUnique({
    where: { id: artistId },
    select: { id: true, userId: true },
  });

  if (!artist) {
    throw createError('Artist not found', 404);
  }

  if (artist.userId !== userId) {
    throw createError('Not authorized to manage this artist\'s calendar', 403);
  }

  const { title, description, eventDate, startTime, endTime, location, type } = req.body;

  const event = await (prisma as any).artistEvent.create({
    data: {
      title,
      description: description || null,
      eventDate: new Date(eventDate),
      startTime: startTime || null,
      endTime: endTime || null,
      location: location || null,
      type: type || 'gig',
      artistId,
    },
  });

  res.status(201).json({ success: true, data: event });
};

/**
 * PUT /api/artists/:artistId/calendar/:eventId
 * Update an existing calendar event.
 */
export const updateCalendarEvent = async (req: AuthRequest, res: Response) => {
  const { artistId, eventId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw createError('Unauthorized', 401);
  }

  // Verify artist ownership
  const artist = await (prisma as any).artist.findUnique({
    where: { id: artistId },
    select: { id: true, userId: true },
  });

  if (!artist || artist.userId !== userId) {
    throw createError('Not authorized', 403);
  }

  // Verify event exists and belongs to this artist
  const existing = await (prisma as any).artistEvent.findFirst({
    where: { id: eventId, artistId },
  });

  if (!existing) {
    throw createError('Calendar event not found', 404);
  }

  const { title, description, eventDate, startTime, endTime, location, type } = req.body;

  const updated = await (prisma as any).artistEvent.update({
    where: { id: eventId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(eventDate !== undefined && { eventDate: new Date(eventDate) }),
      ...(startTime !== undefined && { startTime }),
      ...(endTime !== undefined && { endTime }),
      ...(location !== undefined && { location }),
      ...(type !== undefined && { type }),
    },
  });

  res.json({ success: true, data: updated });
};

/**
 * DELETE /api/artists/:artistId/calendar/:eventId
 * Delete a calendar event.
 */
export const deleteCalendarEvent = async (req: AuthRequest, res: Response) => {
  const { artistId, eventId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw createError('Unauthorized', 401);
  }

  // Verify artist ownership
  const artist = await (prisma as any).artist.findUnique({
    where: { id: artistId },
    select: { id: true, userId: true },
  });

  if (!artist || artist.userId !== userId) {
    throw createError('Not authorized', 403);
  }

  // Verify event exists and belongs to this artist
  const existing = await (prisma as any).artistEvent.findFirst({
    where: { id: eventId, artistId },
  });

  if (!existing) {
    throw createError('Calendar event not found', 404);
  }

  await (prisma as any).artistEvent.delete({
    where: { id: eventId },
  });

  res.json({ success: true, message: 'Calendar event deleted successfully' });
};
