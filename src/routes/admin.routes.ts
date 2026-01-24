import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';

const router = Router();

// Public admin stats endpoint (for admin dashboard)
router.get('/stats', adminController.getAdminStats);

// Admin orders endpoint
router.get('/orders', adminController.getOrders);

// Admin users endpoint
router.get('/users', adminController.getUsers);
router.put('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);

// Admin artist endpoints
router.post('/artists', adminController.createArtist);
router.put('/artists/:id', adminController.updateArtist);
router.delete('/artists/:id', adminController.deleteArtist);

// Admin event endpoints
router.post('/events', adminController.createEvent);
router.put('/events/:id', adminController.updateEvent);
router.delete('/events/:id', adminController.deleteEvent);

// Admin academy endpoints
router.post('/academies', adminController.createAcademy);
router.put('/academies/:id', adminController.updateAcademy);
router.delete('/academies/:id', adminController.deleteAcademy);

// Admin product endpoints
router.post('/products', adminController.createProduct);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

// Admin user endpoints
router.delete('/users/:id', adminController.deleteUser);
router.put('/users/:id/role', adminController.updateUserRole);

// Recent activity endpoint
router.get('/activity', adminController.getRecentActivity);

// Ad endpoints
router.get('/ads', adminController.getAds);
router.get('/ads/placement/:placement', adminController.getAdsForPlacement);
router.get('/ads/:id', adminController.getAd);
router.post('/ads/:id/click', adminController.trackAdClick);

export default router;
