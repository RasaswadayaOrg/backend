import { Response } from 'express';
import { prisma } from '../lib/db';
import { createError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * GET /api/events/calendar?month=3&year=2026
 * Fetch all calendar events for the logged-in organizer in a given month.
 */
export const getOrganizerCalendarEvents = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const month = parseInt(req.query.month as string);
  const year = parseInt(req.query.year as string);

  let where: any = { organizerId: userId };

  if (!isNaN(month) && !isNaN(year)) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    where.eventDate = {
      gte: startDate,
      lte: endDate,
    };
  }

  const events = await (prisma as any).organizerEvent.findMany({
    where,
    orderBy: { eventDate: 'asc' },
  });

  res.json(events);
};

/**
 * GET /api/events/calendar/upcoming
 * Fetch upcoming calendar events for the logged-in organizer (from today onward).
 */
export const getUpcomingCalendarEvents = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const events = await (prisma as any).organizerEvent.findMany({
    where: {
      organizerId: userId,
      eventDate: { gte: new Date() },
    },
    orderBy: { eventDate: 'asc' },
    take: 10,
  });

  res.json(events);
};

/**
 * POST /api/events/calendar
 * Create a new calendar event for the organizer.
 */
export const createOrganizerCalendarEvent = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { title, description, eventDate, startTime, endTime, location, type, artistCount } = req.body;

  const event = await (prisma as any).organizerEvent.create({
    data: {
      title,
      description: description || null,
      eventDate: new Date(eventDate),
      startTime: startTime || null,
      endTime: endTime || null,
      location: location || null,
      type: type || 'cultural_show',
      artistCount: artistCount ? parseInt(artistCount) : null,
      organizerId: userId,
    },
  });

  res.status(201).json(event);
};

/**
 * PUT /api/events/calendar/:eventId
 * Update an existing calendar event.
 */
export const updateOrganizerCalendarEvent = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const eventId = req.params.eventId as string;

  // Verify event exists and belongs to this organizer
  const existing = await (prisma as any).organizerEvent.findUnique({
    where: { id: eventId },
  });

  if (!existing) {
    throw createError('Calendar event not found', 404);
  }

  if (existing.organizerId !== userId) {
    throw createError('Not authorized to update this event', 403);
  }

  const { title, description, eventDate, startTime, endTime, location, type, artistCount } = req.body;

  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description || null;
  if (eventDate !== undefined) updateData.eventDate = new Date(eventDate);
  if (startTime !== undefined) updateData.startTime = startTime || null;
  if (endTime !== undefined) updateData.endTime = endTime || null;
  if (location !== undefined) updateData.location = location || null;
  if (type !== undefined) updateData.type = type;
  if (artistCount !== undefined) updateData.artistCount = artistCount ? parseInt(artistCount) : null;

  const event = await (prisma as any).organizerEvent.update({
    where: { id: eventId },
    data: updateData,
  });

  res.json(event);
};

/**
 * DELETE /api/events/calendar/:eventId
 * Delete a calendar event.
 */
export const deleteOrganizerCalendarEvent = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const eventId = req.params.eventId as string;

  const existing = await (prisma as any).organizerEvent.findUnique({
    where: { id: eventId },
  });

  if (!existing) {
    throw createError('Calendar event not found', 404);
  }

  if (existing.organizerId !== userId) {
    throw createError('Not authorized to delete this event', 403);
  }

  await (prisma as any).organizerEvent.delete({
    where: { id: eventId },
  });

  res.json({ message: 'Calendar event deleted successfully' });
};
