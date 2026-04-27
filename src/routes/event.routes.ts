import { Router } from 'express';
import { body, query } from 'express-validator';
import * as eventController from '../controllers/event.controller';
import * as organizerCalendarController from '../controllers/organizerCalendar.controller';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { uploadEventImage } from '../middleware/upload.middleware';

const router = Router();

// Get all events (public, with optional filters)
router.get(
  '/',
  [
    query('category').optional().isString(),
    query('city').optional().isString(),
    query('search').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('featured').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  optionalAuth,
  eventController.getEvents
);

// Get featured events
router.get('/featured', eventController.getFeaturedEvents);

// Get upcoming events
router.get('/upcoming', eventController.getUpcomingEvents);

// Get organizer's own events (must be BEFORE /:id to avoid route conflict)
router.get(
  '/organizer/me',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  eventController.getOrganizerEvents
);

// Get user's interested events (must be BEFORE /:id to avoid route conflict)
router.get('/user/interested', authenticate, eventController.getUserInterestedEvents);

// ─── Organizer Calendar ────────────────────────────────────────────────
// Get organizer's calendar events (filtered by month/year)
router.get(
  '/calendar',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  organizerCalendarController.getOrganizerCalendarEvents
);

// Get upcoming organizer calendar events
router.get(
  '/calendar/upcoming',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  organizerCalendarController.getUpcomingCalendarEvents
);

// Create organizer calendar event
router.post(
  '/calendar',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('eventDate').isISO8601().withMessage('Valid event date is required'),
    body('type').optional().isIn(['cultural_show', 'workshop', 'meeting', 'rehearsal', 'site_visit', 'other']),
  ],
  validateRequest,
  organizerCalendarController.createOrganizerCalendarEvent
);

// Update organizer calendar event
router.put(
  '/calendar/:eventId',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  [
    body('title').optional().notEmpty(),
    body('eventDate').optional().isISO8601(),
    body('type').optional().isIn(['cultural_show', 'workshop', 'meeting', 'rehearsal', 'site_visit', 'other']),
  ],
  validateRequest,
  organizerCalendarController.updateOrganizerCalendarEvent
);

// Delete organizer calendar event
router.delete(
  '/calendar/:eventId',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  organizerCalendarController.deleteOrganizerCalendarEvent
);

// Get event by ID
router.get('/:id', optionalAuth, eventController.getEventById);

// Upload event image (organizers and admins only)
router.post(
  '/upload-image',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  uploadEventImage.single('image'),
  eventController.uploadImage
);

// Create event (organizers and admins only)
router.post(
  '/',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('eventDate').isISO8601().withMessage('Valid event date is required'),
    body('location').notEmpty().withMessage('Location is required'),
    body('venue').notEmpty().withMessage('Venue is required'),
    body('city').notEmpty().withMessage('City is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('capacity').optional().isInt({ min: 1 }),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('artistIds').optional().isArray().withMessage('artistIds must be an array'),
    body('artistIds.*').optional().isString().withMessage('Each artistId must be a string'),
  ],
  validateRequest,
  eventController.createEvent
);

// Update event
router.put(
  '/:id',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  [
    body('title').optional().notEmpty(),
    body('description').optional().notEmpty(),
    body('eventDate').optional().isISO8601(),
    body('price').optional().isFloat({ min: 0 }),
    body('capacity').optional().isInt({ min: 1 }),
  ],
  validateRequest,
  eventController.updateEvent
);

// Delete event
router.delete(
  '/:id',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  eventController.deleteEvent
);

// Express interest in event
router.post('/:id/interest', authenticate, eventController.expressInterest);

// Remove interest from event
router.delete('/:id/interest', authenticate, eventController.removeInterest);

export default router;
