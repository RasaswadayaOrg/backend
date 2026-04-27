import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { uploadMultipleRoleDocuments } from '../middleware/upload.middleware';
import {
  createRoleRequest,
  getPendingRoleRequests,
  getAllRoleRequests,
  getRoleRequestById,
  approveRoleRequest,
  rejectRoleRequest,
  getMyRoleRequests,
} from '../controllers/roleRequest.controller';

const router = express.Router();

// User routes
router.post(
  '/apply',
  authenticate,
  uploadMultipleRoleDocuments,
  createRoleRequest
);

router.get('/my-requests', authenticate, getMyRoleRequests);

// Admin routes
router.get('/pending', authenticate, authorize('ADMIN'), getPendingRoleRequests);
router.get('/all', authenticate, authorize('ADMIN'), getAllRoleRequests);
router.get('/:id', authenticate, authorize('ADMIN'), getRoleRequestById);
router.post('/:id/approve', authenticate, authorize('ADMIN'), approveRoleRequest);
router.post('/:id/reject', authenticate, authorize('ADMIN'), rejectRoleRequest);

export default router;
