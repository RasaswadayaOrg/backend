import { Router } from 'express';
import { body, query } from 'express-validator';
import * as eventController from '../controllers/event.controller';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';

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

// Get event by ID
router.get('/:id', optionalAuth, eventController.getEventById);

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
    body('price').optional().isFloat({ min: 0 }),
    body('capacity').optional().isInt({ min: 1 }),
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

// Get user's interested events
router.get('/user/interested', authenticate, eventController.getUserInterestedEvents);

export default router;
