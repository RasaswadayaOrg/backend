import { Router } from 'express';
import { body, query } from 'express-validator';
import * as academyController from '../controllers/academy.controller';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';

const router = Router();

// Get all academies
router.get(
  '/',
  [
    query('type').optional().isString(),
    query('location').optional().isString(),
    query('search').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  academyController.getAcademies
);

// Get academy by ID
router.get('/:id', optionalAuth, academyController.getAcademyById);

// Create academy (admin only)
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('type').notEmpty().withMessage('Type is required'),
    body('location').notEmpty().withMessage('Location is required'),
  ],
  validateRequest,
  academyController.createAcademy
);

// Update academy
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  academyController.updateAcademy
);

// Delete academy
router.delete('/:id', authenticate, authorize('ADMIN'), academyController.deleteAcademy);

// Get academy courses
router.get('/:id/courses', academyController.getAcademyCourses);

// Add course to academy
router.post(
  '/:id/courses',
  authenticate,
  authorize('ADMIN'),
  [
    body('name').notEmpty().withMessage('Course name is required'),
  ],
  validateRequest,
  academyController.addCourse
);

// Update course
router.put(
  '/:academyId/courses/:courseId',
  authenticate,
  authorize('ADMIN'),
  academyController.updateCourse
);

// Delete course
router.delete(
  '/:academyId/courses/:courseId',
  authenticate,
  authorize('ADMIN'),
  academyController.deleteCourse
);

// Send enquiry
router.post(
  '/:id/enquiries',
  authenticate,
  [
    body('message').notEmpty().withMessage('Message is required'),
  ],
  validateRequest,
  academyController.sendEnquiry
);

// Get user's enquiries
router.get('/user/enquiries', authenticate, academyController.getUserEnquiries);

export default router;
