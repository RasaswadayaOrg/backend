import { Router } from 'express';
import { body, query } from 'express-validator';
import * as storeController from '../controllers/store.controller';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';

const router = Router();

// Get all stores
router.get(
  '/',
  [
    query('search').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  storeController.getStores
);

// Get store by ID
router.get('/:id', optionalAuth, storeController.getStoreById);

// Create store (authenticated users)
router.post(
  '/',
  authenticate,
  [
    body('name').notEmpty().withMessage('Store name is required'),
  ],
  validateRequest,
  storeController.createStore
);

// Update store
router.put('/:id', authenticate, storeController.updateStore);

// Delete store
router.delete('/:id', authenticate, storeController.deleteStore);

// Get store products
router.get('/:id/products', storeController.getStoreProducts);

// Get user's store
router.get('/user/my-store', authenticate, storeController.getMyStore);

export default router;
