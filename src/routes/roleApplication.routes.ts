import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware';
import { applyForRole, getMyApplications } from '../controllers/roleApplication.controller';

const router = express.Router();

// Memory storage for direct upload to Supabase
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

router.post('/apply', authenticate, upload.single('proofDocument'), applyForRole);
router.get('/my-applications', authenticate, getMyApplications);

export default router;
