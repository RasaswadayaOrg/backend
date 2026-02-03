import express from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { 
  applyForRole, 
  getMyApplications,
  getAllApplications,
  updateApplicationStatus 
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
router.get('/all', authenticate, authorize('ADMIN'), getAllApplications);
router.put('/:id/status', authenticate, authorize('ADMIN'), updateApplicationStatus);

export default router;
