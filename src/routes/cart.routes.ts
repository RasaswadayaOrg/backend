import { Router } from 'express';
import { body } from 'express-validator';
import * as cartController from '../controllers/cart.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';

const router = Router();

// Get cart
router.get('/', authenticate, cartController.getCart);

// Add item to cart
router.post(
  '/',
  authenticate,
  [
    body('productId').notEmpty().withMessage('Product ID is required'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  validateRequest,
  cartController.addToCart
);

// Update cart item quantity
router.put(
  '/:productId',
  authenticate,
  [
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  validateRequest,
  cartController.updateCartItem
);

// Remove item from cart
router.delete('/:productId', authenticate, cartController.removeFromCart);

// Clear cart
router.delete('/', authenticate, cartController.clearCart);

export default router;
