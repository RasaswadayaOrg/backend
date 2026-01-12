import { Router } from 'express';
import { body, query } from 'express-validator';
import * as artistController from '../controllers/artist.controller';
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

export default router;
