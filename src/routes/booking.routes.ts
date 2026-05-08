import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  createBooking,
  getArtistBookings,
  updateBookingStatus
} from '../controllers/booking.controller';

const router = Router();

// Create new booking request (Organizer)
router.post('/', authenticate, authorize('ORGANIZER', 'ADMIN'), createBooking);

// Get bookings for artist dashboard (Artist)
router.get('/artist', authenticate, authorize('ARTIST', 'ADMIN'), getArtistBookings);

// Update status of booking (Approve/Reject by Artist)
router.patch('/:id/status', authenticate, authorize('ARTIST', 'ADMIN'), updateBookingStatus);

export default router;