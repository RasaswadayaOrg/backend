import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';

const router = Router();

// Register
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('fullName').notEmpty().withMessage('Full name is required'),
  ],
  validateRequest,
  authController.register
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validateRequest,
  authController.login
);

// Get current user
router.get('/me', authenticate, authController.getCurrentUser);

// Get my reminders
router.get('/reminders', authenticate, authController.getReminders);

// Update profile
router.put(
  '/profile',
  authenticate,
  [
    body('fullName').optional().notEmpty().withMessage('Full name cannot be empty'),
    body('phone').optional(),
    body('city').optional(),
  ],
  validateRequest,
  authController.updateProfile
);

// Change password
router.put(
  '/password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ],
  validateRequest,
  authController.changePassword
);

// Google OAuth
router.post(
  '/google',
  [
    body('accessToken').notEmpty().withMessage('Access token is required'),
  ],
  validateRequest,
  authController.googleAuth
);

export default router;
