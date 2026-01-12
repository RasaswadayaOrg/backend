import { Router } from 'express';
import { body, query } from 'express-validator';
import * as orderController from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';

const router = Router();

// Get user's orders
router.get('/', authenticate, orderController.getUserOrders);

// Get order by ID
router.get('/:id', authenticate, orderController.getOrderById);

// Create order from cart
router.post(
  '/',
  authenticate,
  [
    body('shippingAddress').notEmpty().withMessage('Shipping address is required'),
  ],
  validateRequest,
  orderController.createOrder
);

// Update order status (admin/store owner)
router.put(
  '/:id/status',
  authenticate,
  authorize('STORE_OWNER', 'ADMIN'),
  [
    body('status').isIn(['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
      .withMessage('Invalid order status'),
  ],
  validateRequest,
  orderController.updateOrderStatus
);

// Cancel order
router.put('/:id/cancel', authenticate, orderController.cancelOrder);

export default router;
