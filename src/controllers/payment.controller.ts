import { Request, Response } from 'express';
import { createId } from '@paralleldrive/cuid2';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';
import {
  buildRequestHash,
  formatAmount,
  getCheckoutUrl,
  getPayHereConfig,
  retrievePaymentByOrder,
  statusCodeToPaymentStatus,
  verifyNotifySignature,
} from '../services/payhere.service';

/**
 * POST /api/v1/payments/payhere/initiate/:orderId
 *
 * Returns the PayHere checkout URL + form fields (incl. signed `hash`) so the
 * frontend can submit a hidden form to PayHere. Order must belong to the
 * authenticated user and be in PENDING state with a valid totalAmount.
 */
export const initiatePayHere = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { orderId } = req.params;

  const cfg = getPayHereConfig();
  if (!cfg.merchantId || !cfg.merchantSecret) {
    throw createError('PayHere is not configured on the server', 500);
  }

  // Load order + buyer
  const { data: order, error } = await supabase
    .from('Order')
    .select(`
      id, userId, status, totalAmount, currency, shippingAddress,
      user:User!Order_userId_fkey(id, fullName, firstName, lastName, email, phone, city)
    `)
    .eq('id', orderId)
    .single();

  if (error || !order) throw createError('Order not found', 404);
  if (order.userId !== userId) throw createError('Not authorized for this order', 403);
  if (order.status !== 'PENDING') throw createError(`Order is already ${order.status}`, 400);

  const amount = Number(order.totalAmount || 0);
  if (!(amount > 0)) throw createError('Order total must be greater than zero', 400);

  const currency = order.currency || 'LKR';
  const amountStr = formatAmount(amount);

  const hash = buildRequestHash({
    merchantId: cfg.merchantId,
    orderId: order.id,
    amount: amountStr,
    currency,
    merchantSecret: cfg.merchantSecret,
  });

  const buyer: any = order.user || {};
  const fullName = buyer.fullName || [buyer.firstName, buyer.lastName].filter(Boolean).join(' ') || 'Customer';
  const [firstName, ...rest] = fullName.split(' ');
  const lastName = rest.join(' ') || firstName;

  // Mark intended payment method on order so the seller can see how it was paid
  await supabase
    .from('Order')
    .update({ paymentMethod: 'payhere', currency, updatedAt: new Date().toISOString() })
    .eq('id', order.id);

  // Upsert a Payment row in PENDING state so we can later match the IPN
  const { data: existing } = await supabase
    .from('Payment')
    .select('id')
    .eq('orderId', order.id)
    .maybeSingle();

  if (!existing) {
    await supabase.from('Payment').insert({
      id: createId(),
      orderId: order.id,
      provider: 'payhere',
      payhereOrderId: order.id,
      status: 'PENDING',
      amount,
      currency,
    });
  }

  const fields = {
    merchant_id: cfg.merchantId,
    return_url:  `${cfg.frontendUrl}/checkout/success?order=${order.id}`,
    cancel_url:  `${cfg.frontendUrl}/checkout/cancel?order=${order.id}`,
    notify_url:  `${cfg.publicUrl}/api/v1/payments/payhere/notify`,
    order_id:    order.id,
    items:       `Order ${order.id.slice(0, 8).toUpperCase()}`,
    currency,
    amount:      amountStr,
    first_name:  firstName,
    last_name:   lastName,
    email:       buyer.email || '',
    phone:       buyer.phone || '',
    address:     order.shippingAddress || '',
    city:        buyer.city || 'Colombo',
    country:     'Sri Lanka',
    hash,
  };

  res.json({
    success: true,
    data: {
      checkoutUrl: getCheckoutUrl(cfg),
      sandbox: cfg.sandbox,
      fields,
    },
  });
};

/**
 * POST /api/v1/payments/payhere/notify
 *
 * Server-to-server IPN from PayHere (form-encoded). Verifies md5sig, persists
 * Payment record, updates Order.status -> PAID on success.
 *
 * MUST be public (no auth header).
 */
export const handlePayHereNotify = async (req: Request, res: Response) => {
  const cfg = getPayHereConfig();

  const {
    merchant_id,
    order_id,
    payment_id,
    payhere_amount,
    payhere_currency,
    status_code,
    md5sig,
    method,
    status_message,
  } = req.body || {};

  if (!merchant_id || !order_id || !md5sig) {
    return res.status(400).send('Missing fields');
  }

  if (String(merchant_id) !== String(cfg.merchantId)) {
    return res.status(400).send('Merchant mismatch');
  }

  const valid = verifyNotifySignature({
    merchantId: cfg.merchantId,
    orderId: String(order_id),
    payhereAmount: String(payhere_amount),
    payhereCurrency: String(payhere_currency),
    statusCode: String(status_code),
    md5sig: String(md5sig),
    merchantSecret: cfg.merchantSecret,
  });

  if (!valid) {
    return res.status(400).send('Invalid signature');
  }

  const paymentStatus = statusCodeToPaymentStatus(String(status_code));
  const now = new Date().toISOString();

  // Upsert Payment row
  const { data: existing } = await supabase
    .from('Payment')
    .select('id')
    .eq('orderId', order_id)
    .maybeSingle();

  const paymentPayload = {
    payherePaymentId: payment_id ? String(payment_id) : null,
    status: paymentStatus,
    statusCode: String(status_code),
    statusMessage: status_message || null,
    method: method || null,
    amount: Number(payhere_amount || 0),
    currency: String(payhere_currency || 'LKR'),
    rawNotify: req.body,
    updatedAt: now,
  };

  if (existing) {
    await supabase.from('Payment').update(paymentPayload).eq('id', existing.id);
  } else {
    await supabase.from('Payment').insert({
      id: createId(),
      orderId: String(order_id),
      provider: 'payhere',
      payhereOrderId: String(order_id),
      ...paymentPayload,
      createdAt: now,
    });
  }

  // Reflect on Order
  if (paymentStatus === 'SUCCESS') {
    await supabase
      .from('Order')
      .update({ status: 'PAID', paidAt: now, updatedAt: now })
      .eq('id', order_id);
  } else if (paymentStatus === 'CANCELLED' || paymentStatus === 'FAILED') {
    // Leave the Order PENDING so the buyer can retry, but record the failure.
    await supabase.from('Order').update({ updatedAt: now }).eq('id', order_id);
  }

  // PayHere expects HTTP 200 with any body
  res.status(200).send('OK');
};

/**
 * GET /api/v1/payments/order/:orderId
 *
 * Returns the latest payment + order status. Used by the frontend success
 * page to poll until PayHere finishes processing.
 */
export const getPaymentByOrder = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { orderId } = req.params;

  const { data: order, error } = await supabase
    .from('Order')
    .select('id, userId, status, totalAmount, currency, paidAt, paymentMethod')
    .eq('id', orderId)
    .single();

  if (error || !order) throw createError('Order not found', 404);
  if (order.userId !== userId && req.user?.role !== 'ADMIN') {
    throw createError('Not authorized', 403);
  }

  const { data: payment } = await supabase
    .from('Payment')
    .select('id, status, statusCode, statusMessage, method, amount, currency, payherePaymentId, updatedAt')
    .eq('orderId', orderId)
    .maybeSingle();

  res.json({ success: true, data: { order, payment } });
};

/**
 * POST /api/v1/payments/payhere/verify/:orderId
 *
 * Fallback when the PayHere IPN webhook hasn't reached us (e.g. backend on
 * localhost in development, or transient network failures in production).
 * Calls PayHere's Retrieval API directly to fetch authoritative payment
 * status, then mirrors the same Payment/Order DB updates the IPN handler
 * would have done.
 */
export const verifyPayHerePayment = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const orderId = String(req.params.orderId);
  const cfg = getPayHereConfig();

  const { data: order, error } = await supabase
    .from('Order')
    .select('id, userId, status, totalAmount, currency, paidAt')
    .eq('id', orderId)
    .single();

  if (error || !order) throw createError('Order not found', 404);
  if (order.userId !== userId && req.user?.role !== 'ADMIN') {
    throw createError('Not authorized', 403);
  }

  // If the order is already PAID, just return current state — no need to hit
  // PayHere again (saves API calls and is idempotent).
  if (order.status === 'PAID') {
    const { data: payment } = await supabase
      .from('Payment')
      .select('id, status, statusCode, statusMessage, method, amount, currency, payherePaymentId, updatedAt')
      .eq('orderId', orderId)
      .maybeSingle();
    return res.json({ success: true, data: { order, payment, source: 'cache' } });
  }

  let retrieved;
  try {
    retrieved = await retrievePaymentByOrder(orderId, cfg);
  } catch (e: any) {
    throw createError(e?.message || 'PayHere retrieval failed', 502);
  }

  if (!retrieved) {
    // PayHere has no record of this order yet — user may have abandoned the
    // checkout, or hasn't completed it. Return current DB state unchanged.
    const { data: payment } = await supabase
      .from('Payment')
      .select('id, status, statusCode, statusMessage, method, amount, currency, payherePaymentId, updatedAt')
      .eq('orderId', orderId)
      .maybeSingle();
    return res.json({ success: true, data: { order, payment, source: 'payhere-empty' } });
  }

  // Mirror the IPN handler's upsert + Order update logic.
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from('Payment')
    .select('id')
    .eq('orderId', orderId)
    .maybeSingle();

  const paymentPayload: Record<string, unknown> = {
    payherePaymentId: retrieved.paymentId,
    status: retrieved.status,
    statusCode: null,
    statusMessage: retrieved.statusRaw,
    method: retrieved.method,
    amount: retrieved.amount,
    currency: retrieved.currency,
    rawNotify: { source: 'retrieval-api', raw: retrieved.raw },
    updatedAt: now,
  };

  if (existing) {
    await supabase.from('Payment').update(paymentPayload).eq('id', existing.id);
  } else {
    await supabase.from('Payment').insert({
      id: createId(),
      orderId: String(orderId),
      provider: 'payhere',
      payhereOrderId: String(orderId),
      ...paymentPayload,
      createdAt: now,
    });
  }

  if (retrieved.status === 'SUCCESS' && order.status !== 'PAID') {
    await supabase
      .from('Order')
      .update({ status: 'PAID', paidAt: now, updatedAt: now })
      .eq('id', orderId);
  }

  // Return the freshly-updated rows.
  const { data: updatedOrder } = await supabase
    .from('Order')
    .select('id, userId, status, totalAmount, currency, paidAt, paymentMethod')
    .eq('id', orderId)
    .single();

  const { data: payment } = await supabase
    .from('Payment')
    .select('id, status, statusCode, statusMessage, method, amount, currency, payherePaymentId, updatedAt')
    .eq('orderId', orderId)
    .maybeSingle();

  res.json({
    success: true,
    data: { order: updatedOrder, payment, source: 'payhere-retrieval' },
  });
};
