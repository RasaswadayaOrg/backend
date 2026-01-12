import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Get all users (admin only)
router.get('/', authenticate, authorize('ADMIN'), userController.getUsers);

// Get user by ID (admin only)
router.get('/:id', authenticate, authorize('ADMIN'), userController.getUserById);

// Update user role (admin only)
router.put('/:id/role', authenticate, authorize('ADMIN'), userController.updateUserRole);

// Delete user (admin only)
router.delete('/:id', authenticate, authorize('ADMIN'), userController.deleteUser);

export default router;
