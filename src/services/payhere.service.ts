/**
 * PayHere helpers.
 * Docs: https://support.payhere.lk/api-&-mobile-sdk/checkout-api
 *
 * Hash formula (request):
 *   hash = strtoupper(md5(
 *     merchant_id + order_id + amount + currency + strtoupper(md5(merchant_secret))
 *   ))
 *
 * IPN signature (notify_url):
 *   md5sig = strtoupper(md5(
 *     merchant_id + order_id + payhere_amount + payhere_currency + status_code +
 *     strtoupper(md5(merchant_secret))
 *   ))
 *
 * Status codes from PayHere:
 *   2  = SUCCESS
 *   0  = PENDING
 *  -1  = CANCELLED
 *  -2  = FAILED
 *  -3  = CHARGEDBACK
 */

import crypto from 'crypto';

const SANDBOX_CHECKOUT = 'https://sandbox.payhere.lk/pay/checkout';
const LIVE_CHECKOUT    = 'https://www.payhere.lk/pay/checkout';

export interface PayHereConfig {
  merchantId: string;
  merchantSecret: string;
  sandbox: boolean;
  publicUrl: string;   // public base URL of backend (for notify_url)
  frontendUrl: string; // frontend base URL (for return_url, cancel_url)
}

export function getPayHereConfig(): PayHereConfig {
  const merchantId     = process.env.PAYHERE_MERCHANT_ID || '';
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || '';
  const sandbox        = (process.env.PAYHERE_SANDBOX || 'true').toLowerCase() !== 'false';
  const publicUrl      = process.env.PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3001';
  const frontendUrl    = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (!merchantId || !merchantSecret) {
    // Don't throw at import-time; let the controller throw a clean 500 when used.
  }
  return { merchantId, merchantSecret, sandbox, publicUrl, frontendUrl };
}

export function getCheckoutUrl(cfg: PayHereConfig = getPayHereConfig()) {
  return cfg.sandbox ? SANDBOX_CHECKOUT : LIVE_CHECKOUT;
}

/** PayHere expects amount with exactly 2 decimal places, no thousands separator. */
export function formatAmount(amount: number): string {
  return Number(amount).toFixed(2);
}

function md5Upper(input: string): string {
  return crypto.createHash('md5').update(input).digest('hex').toUpperCase();
}

export function buildRequestHash(params: {
  merchantId: string;
  orderId: string;
  amount: string;          // already formatted via formatAmount
  currency: string;
  merchantSecret: string;
}): string {
  const secretHash = md5Upper(params.merchantSecret);
  return md5Upper(
    params.merchantId + params.orderId + params.amount + params.currency + secretHash
  );
}

export function verifyNotifySignature(params: {
  merchantId: string;
  orderId: string;
  payhereAmount: string;
  payhereCurrency: string;
  statusCode: string;
  md5sig: string;
  merchantSecret: string;
}): boolean {
  const secretHash = md5Upper(params.merchantSecret);
  const expected = md5Upper(
    params.merchantId +
    params.orderId +
    params.payhereAmount +
    params.payhereCurrency +
    params.statusCode +
    secretHash
  );
  return expected === (params.md5sig || '').toUpperCase();
}

export function statusCodeToPaymentStatus(code: string):
  'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'CHARGEDBACK' {
  switch (String(code)) {
    case '2':  return 'SUCCESS';
    case '0':  return 'PENDING';
    case '-1': return 'CANCELLED';
    case '-2': return 'FAILED';
    case '-3': return 'CHARGEDBACK';
    default:   return 'PENDING';
  }
}
