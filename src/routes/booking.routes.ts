import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createBooking,
  getArtistBookings,
  updateBookingStatus
} from '../controllers/booking.controller';

const router = Router();

// Create new booking request (Organizer)
router.post('/', authenticate, createBooking);

// Get bookings for artist dashboard (Artist)
router.get('/artist', authenticate, getArtistBookings);

// Update status of booking (Approve/Reject by Artist)
router.patch('/:id/status', authenticate, updateBookingStatus);

export default router;