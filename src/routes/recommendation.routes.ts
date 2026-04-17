import { Router } from 'express';
import { getUserRecommendations } from '../controllers/recommendation.controller';
import { authenticate } from '../middleware/auth.middleware'; // Checking for auth middleware

const router = Router();

// Protect it with authentication middleware if user exists
router.get('/', authenticate, getUserRecommendations);

export default router;
