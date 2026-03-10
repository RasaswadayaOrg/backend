import { Router } from 'express';
import { body, query } from 'express-validator';
import * as artistController from '../controllers/artist.controller';
import * as postController from '../controllers/post.controller';
import * as fbOAuthController from '../controllers/facebookOAuth.controller';
import * as calendarController from '../controllers/calendar.controller';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';

const router = Router();

// Get all artists (public)
router.get(
  '/',
  [
    query('genre').optional().isString(),
    query('profession').optional().isString(),
    query('search').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  optionalAuth,
  artistController.getArtists
);

// Get current user's artist profile
router.get('/me', authenticate, artistController.getMe);

// Get artist by ID
router.get('/:id', optionalAuth, artistController.getArtistById);

// Create artist profile (for users to become artists)
router.post(
  '/',
  authenticate,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('profession').notEmpty().withMessage('Profession is required'),
    body('genre').notEmpty().withMessage('Genre is required'),
    body('bio').optional().isString(),
  ],
  validateRequest,
  artistController.createArtist
);

// Update artist profile
router.put(
  '/:id',
  authenticate,
  [
    body('name').optional().notEmpty(),
    body('profession').optional().notEmpty(),
    body('genre').optional().notEmpty(),
  ],
  validateRequest,
  artistController.updateArtist
);

// Delete artist profile
router.delete('/:id', authenticate, authorize('ADMIN'), artistController.deleteArtist);

// Follow artist
router.post('/:id/follow', authenticate, artistController.followArtist);

// Unfollow artist
router.delete('/:id/follow', authenticate, artistController.unfollowArtist);

// Get artist's followers
router.get('/:id/followers', artistController.getArtistFollowers);

// Get artist's upcoming events
router.get('/:id/events', artistController.getArtistEvents);

// Get user's followed artists
router.get('/user/following', authenticate, artistController.getUserFollowedArtists);

// --- Calendar Event Routes ---

// Get artist's calendar events (public — organizers can view)
router.get('/:artistId/calendar', calendarController.getCalendarEvents);

// Create calendar event (Artist only)
router.post(
  '/:artistId/calendar',
  authenticate,
  authorize('ARTIST'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('eventDate').notEmpty().withMessage('Event date is required'),
    body('startTime').optional().isString(),
    body('endTime').optional().isString(),
    body('location').optional().isString(),
    body('description').optional().isString(),
    body('type').optional().isIn(['gig', 'private', 'recording', 'rehearsal', 'other']),
  ],
  validateRequest,
  calendarController.createCalendarEvent
);

// Update calendar event (Artist only)
router.put(
  '/:artistId/calendar/:eventId',
  authenticate,
  authorize('ARTIST'),
  [
    body('title').optional().notEmpty(),
    body('eventDate').optional().notEmpty(),
    body('startTime').optional().isString(),
    body('endTime').optional().isString(),
    body('location').optional().isString(),
    body('description').optional().isString(),
    body('type').optional().isIn(['gig', 'private', 'recording', 'rehearsal', 'other']),
  ],
  validateRequest,
  calendarController.updateCalendarEvent
);

// Delete calendar event (Artist only)
router.delete(
  '/:artistId/calendar/:eventId',
  authenticate,
  authorize('ARTIST'),
  calendarController.deleteCalendarEvent
);

// --- Facebook OAuth Routes ---

// Get Facebook OAuth URL (start the flow)
router.get('/facebook/auth-url', authenticate, fbOAuthController.getAuthUrl);

// Exchange OAuth code for token + get pages list
router.post('/facebook/callback', authenticate, fbOAuthController.handleCallback);

// Save selected page to artist profile
router.post(
  '/:artistId/facebook/select-page',
  authenticate,
  authorize('ARTIST'),
  body('pageId').isString().notEmpty(),
  body('pageAccessToken').isString().notEmpty(),
  body('pageName').optional().isString(),
  validateRequest,
  fbOAuthController.selectPage
);

// --- Post & Social Integration Routes ---

// Get artist posts
router.get('/:artistId/posts', postController.getArtistPosts);

import { uploadPostImage } from '../middleware/upload.middleware';

// ...existing code...
// Create manual post (Artist only)
router.post(
  '/:artistId/posts',
  authenticate,
  authorize('ARTIST'),
  uploadPostImage.single('image'),
  [
    body('title').optional().isString().withMessage('Title must be a string'),
    body('content').notEmpty().withMessage('Content (description) is required'),
    body('videoUrl')
      .optional()
      .custom((value) => {
        if (value && !value.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/)) {
          throw new Error('Video URL must be a valid YouTube link');
        }
        return true;
      }),
  ],
  validateRequest,
  postController.createPost
);

// Update manual post (Artist only)
router.put(
  '/:artistId/posts/:postId',
  authenticate,
  authorize('ARTIST'),
  [
    body('title').optional().isString(),
    body('content').optional().isString(),
    body('videoUrl').optional().isURL(),
  ],
  validateRequest,
  postController.updatePost
);

// Delete manual post (Artist only or Admin)
router.delete(
  '/:artistId/posts/:postId',
  authenticate,
  authorize('ARTIST', 'ADMIN'),
  postController.deletePost
);

// Get single post
router.get(
  '/:artistId/posts/:postId',
  postController.getPostById
);

// Connect Facebook with User Access Token (Implicit Flow)
router.post(
  '/:artistId/connect-facebook',
  authenticate,
  authorize('ARTIST'),
  body('userAccessToken').isString().notEmpty(),
  validateRequest,
  postController.connectFacebookWithUserToken
);

// Sync Facebook Posts
router.post(
  '/:artistId/sync-facebook',
  authenticate,
  authorize('ARTIST'),
  validateRequest,
  postController.syncFacebook
);

export default router;
