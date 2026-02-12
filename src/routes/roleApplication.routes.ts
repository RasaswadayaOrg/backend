import express from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { 
  applyForRole, 
  getMyApplications,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
  approveApplication,
  rejectApplication,
  getPendingApplications
} from '../controllers/roleApplication.controller';

const router = express.Router();

// Memory storage for direct upload to Supabase
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// User routes
router.post('/apply', authenticate, upload.single('proofDocument'), applyForRole);
router.get('/my-applications', authenticate, getMyApplications);

// Admin routes
router.get('/pending', authenticate, authorize('ADMIN'), getPendingApplications);
router.get('/all', authenticate, authorize('ADMIN'), getAllApplications);
router.get('/:id', authenticate, authorize('ADMIN'), getApplicationById);

// Admin actions - using POST for approve/reject
router.post('/:id/approve', authenticate, authorize('ADMIN'), approveApplication);
router.post('/:id/reject', authenticate, authorize('ADMIN'), rejectApplication);

// Legacy route (PUT) - kept for backward compatibility
router.put('/:id/status', authenticate, authorize('ADMIN'), updateApplicationStatus);

export default router;
