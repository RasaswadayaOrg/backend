import { Router } from 'express';
import { body, query } from 'express-validator';
import * as artistController from '../controllers/artist.controller';
import * as postController from '../controllers/post.controller';
import * as fbOAuthController from '../controllers/facebookOAuth.controller';
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

// --- Facebook OAuth Routes ---

// Get Facebook OAuth URL (start the flow)
router.get('/facebook/auth-url', authenticate, fbOAuthController.getAuthUrl);

// Exchange OAuth code for token + get pages list
router.post('/facebook/callback', fbOAuthController.handleCallback);

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

// Create manual post (Artist only)
router.post(
  '/:artistId/posts',
  authenticate,
  authorize('ARTIST'),
  body('content').optional().isString(),
  body('imageUrl').optional().isURL(),
  body('videoUrl').optional().isURL(),
  validateRequest,
  postController.createPost
);

// Connect Facebook Page (Artist only)
router.post(
  '/:artistId/connect-facebook',
  authenticate,
  authorize('ARTIST'),
  body('pageId').isString().notEmpty(),
  body('accessToken').isString().notEmpty(),
  validateRequest,
  postController.connectFacebook
);

export default router;
