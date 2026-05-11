import { Router } from 'express';
import express from 'express';
import * as paymentController from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// PayHere IPN — public, form-encoded body. Must accept x-www-form-urlencoded.
router.post(
  '/payhere/notify',
  express.urlencoded({ extended: true }),
  paymentController.handlePayHereNotify
);

// Initiate PayHere checkout (returns signed form fields)
router.post('/payhere/initiate/:orderId', authenticate, paymentController.initiatePayHere);

// Fallback: ask PayHere directly for the current payment status. Used when the
// IPN webhook hasn't reached the backend (e.g. localhost dev or webhook outage).
router.post('/payhere/verify/:orderId', authenticate, paymentController.verifyPayHerePayment);

// Poll payment status for an order
router.get('/order/:orderId', authenticate, paymentController.getPaymentByOrder);

export default router;
