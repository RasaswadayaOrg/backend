import { Response } from 'express';
import { prisma } from '../lib/db';
import { AuthRequest } from '../middleware/auth.middleware';

const bookingEventId = (bookingId: string) => `evt-booking-${bookingId}`;

const createPerformanceForAcceptedBooking = async (booking: {
  id: string;
  eventName: string;
  date: Date;
  time: string;
  venue: string;
  description: string | null;
  organizerId: string;
  artistId: string;
  organizer?: { city: string | null } | null;
}) => {
  const eventId = bookingEventId(booking.id);
  const event = await prisma.event.upsert({
    where: { id: eventId },
    update: {
      title: booking.eventName,
      eventDate: booking.date,
      startTime: booking.time,
      location: booking.venue,
      venue: booking.venue,
      city: booking.organizer?.city || booking.venue,
      description: booking.description || `Booking request for ${booking.eventName}`,
      category: 'Booking',
      organizerId: booking.organizerId,
    },
    create: {
      id: eventId,
      title: booking.eventName,
      description: booking.description || `Booking request for ${booking.eventName}`,
      eventDate: booking.date,
      startTime: booking.time,
      location: booking.venue,
      venue: booking.venue,
      city: booking.organizer?.city || booking.venue,
      category: 'Booking',
      organizerId: booking.organizerId,
    },
  });

  await prisma.performance.upsert({
    where: {
      artistId_eventId: {
        artistId: booking.artistId,
        eventId: event.id,
      },
    },
    update: { role: 'Booked artist' },
    create: {
      artistId: booking.artistId,
      eventId: event.id,
      role: 'Booked artist',
    },
  });

  return event;
};

// Create a new booking request
export const createBooking = async (req: AuthRequest, res: Response) => {
  try {
    const organizerId = req.user?.id;
    const userRole = req.user?.role;
    if (!organizerId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!['ORGANIZER', 'ADMIN'].includes(userRole || '')) {
      return res.status(403).json({ success: false, error: 'Only organizers can create booking requests' });
    }

    const { artistId, eventName, date, time, venue, description } = req.body;

    if (!artistId || !eventName || !date || !time || !venue) {
      return res.status(400).json({ success: false, error: 'All fields are required except description' });
    }

    // Ensure artist exists
    const artist = await prisma.artist.findUnique({ where: { id: artistId } });
    if (!artist) {
      return res.status(404).json({ success: false, error: 'Artist not found' });
    }

    const bookingRequest = await prisma.bookingRequest.create({
      data: {
        eventName,
        date: new Date(date),
        time,
        venue,
        description,
        artistId,
        organizerId
      }
    });

    res.status(201).json({ success: true, data: bookingRequest });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ success: false, error: 'Failed to create booking request' });
  }
};

// Get booking requests for the logged in artist
export const getArtistBookings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (userRole === 'ADMIN') {
      const bookings = await prisma.bookingRequest.findMany({
        include: {
          organizer: {
            select: { id: true, email: true, avatarUrl: true, fullName: true }
          },
          artist: {
            select: { id: true, name: true, profession: true, photoUrl: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.status(200).json({ success: true, data: bookings });
    }

    // Find the artist record for this user
    const artist = await prisma.artist.findUnique({ where: { userId } });
    if (!artist) {
      return res.status(404).json({ success: false, error: 'Artist profile not found' });
    }

    const bookings = await prisma.bookingRequest.findMany({
      where: { artistId: artist.id },
      include: {
        organizer: {
          select: { id: true, email: true, avatarUrl: true, fullName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    console.error('Get artist bookings error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
  }
};

// Update booking request status
export const updateBookingStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const booking = await prisma.bookingRequest.findUnique({
      where: { id },
      include: { organizer: { select: { city: true } } }
    });
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    if (userRole !== 'ADMIN') {
      const artist = await prisma.artist.findUnique({ where: { userId } });
      if (!artist) {
        return res.status(404).json({ success: false, error: 'Artist profile not found' });
      }

      if (booking.artistId !== artist.id) {
        return res.status(403).json({ success: false, error: 'Not authorized to update this booking' });
      }
    }

    const updatedBooking = await prisma.bookingRequest.update({
      where: { id },
      data: { status }
    });

    let performanceEvent = null;
    if (status === 'ACCEPTED') {
      performanceEvent = await createPerformanceForAcceptedBooking(booking);
    }

    res.status(200).json({ success: true, data: updatedBooking, performanceEvent });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update booking status' });
  }
};
