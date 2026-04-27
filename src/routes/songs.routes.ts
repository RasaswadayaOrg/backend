import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import * as songsController from '../controllers/songs.controller';

const router = Router();

// Get all posts/songs with images (public)
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('artistId').optional().isString(),
  ],
  validateRequest,
  optionalAuth,
  songsController.getAllSongs
);

// Get single post/song by ID (public)
router.get(
  '/:id',
  [param('id').isString().notEmpty()],
  validateRequest,
  optionalAuth,
  songsController.getSongById
);

// Like a post (authenticated)
router.post(
  '/:id/like',
  authenticate,
  [param('id').isString().notEmpty()],
  validateRequest,
  songsController.likePost
);

// Unlike a post (authenticated)
router.delete(
  '/:id/like',
  authenticate,
  [param('id').isString().notEmpty()],
  validateRequest,
  songsController.unlikePost
);

// Get comments for a post (public)
router.get(
  '/:id/comments',
  [
    param('id').isString().notEmpty(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  songsController.getComments
);

// Add comment to a post (authenticated)
router.post(
  '/:id/comments',
  authenticate,
  [
    param('id').isString().notEmpty(),
    body('content').notEmpty().withMessage('Comment content is required'),
  ],
  validateRequest,
  songsController.addComment
);

// Delete comment (authenticated - owner only)
router.delete(
  '/:postId/comments/:commentId',
  authenticate,
  [
    param('postId').isString().notEmpty(),
    param('commentId').isString().notEmpty(),
  ],
  validateRequest,
  songsController.deleteComment
);

// Follow an artist (authenticated)
router.post(
  '/artists/:artistId/follow',
  authenticate,
  [param('artistId').isString().notEmpty()],
  validateRequest,
  songsController.followArtist
);

// Unfollow an artist (authenticated)
router.delete(
  '/artists/:artistId/follow',
  authenticate,
  [param('artistId').isString().notEmpty()],
  validateRequest,
  songsController.unfollowArtist
);

// Check if user follows an artist (authenticated)
router.get(
  '/artists/:artistId/following',
  authenticate,
  [param('artistId').isString().notEmpty()],
  validateRequest,
  songsController.checkFollowing
);

export default router;
