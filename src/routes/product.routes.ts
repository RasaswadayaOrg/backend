import { Router } from 'express';
import { body, query } from 'express-validator';
import * as productController from '../controllers/product.controller';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';

const router = Router();

// Get all products
router.get(
  '/',
  [
    query('category').optional().isString(),
    query('search').optional().isString(),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  productController.getProducts
);

// Get product categories
router.get('/categories', productController.getCategories);

// Get product by ID
router.get('/:id', optionalAuth, productController.getProductById);

// Create product (store owners)
router.post(
  '/',
  authenticate,
  authorize('STORE_OWNER', 'ADMIN'),
  [
    body('name').notEmpty().withMessage('Product name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
    body('storeId').optional().isString(),
  ],
  validateRequest,
  productController.createProduct
);

// Update product
router.put(
  '/:id',
  authenticate,
  authorize('STORE_OWNER', 'ADMIN'),
  productController.updateProduct
);

// Delete product
router.delete(
  '/:id',
  authenticate,
  authorize('STORE_OWNER', 'ADMIN'),
  productController.deleteProduct
);

export default router;
