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

// Merchant API base (OAuth + Retrieval API)
const SANDBOX_API_BASE = 'https://sandbox.payhere.lk';
const LIVE_API_BASE    = 'https://www.payhere.lk';

export interface PayHereConfig {
  merchantId: string;
  merchantSecret: string;
  appId: string;          // PayHere App ID — required for Retrieval API
  appSecret: string;      // PayHere App Secret — required for Retrieval API
  sandbox: boolean;
  publicUrl: string;      // public base URL of backend (for notify_url)
  frontendUrl: string;    // frontend base URL (for return_url, cancel_url)
}

export function getPayHereConfig(): PayHereConfig {
  const merchantId     = process.env.PAYHERE_MERCHANT_ID || '';
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || '';
  const appId          = process.env.PAYHERE_APP_ID || '';
  const appSecret      = process.env.PAYHERE_APP_SECRET || '';
  const sandbox        = (process.env.PAYHERE_SANDBOX || 'true').toLowerCase() !== 'false';
  const publicUrl      = process.env.PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3001';
  const frontendUrl    = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (!merchantId || !merchantSecret) {
    // Don't throw at import-time; let the controller throw a clean 500 when used.
  }
  return { merchantId, merchantSecret, appId, appSecret, sandbox, publicUrl, frontendUrl };
}

export function getApiBase(cfg: PayHereConfig = getPayHereConfig()) {
  return cfg.sandbox ? SANDBOX_API_BASE : LIVE_API_BASE;
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

// ─────────────────────────────────────────────────────────────────────────────
// Retrieval API — used as a fallback when the IPN webhook can't be delivered
// (e.g. backend is on localhost during development, or PayHere's webhook is
// temporarily failing). Docs:
//   https://support.payhere.lk/api-&-mobile-sdk/retrieval-api
// ─────────────────────────────────────────────────────────────────────────────

type CachedToken = { token: string; expiresAt: number };
let tokenCache: CachedToken | null = null;

/** OAuth2 client_credentials flow. Caches the token until 60s before expiry. */
export async function getMerchantAccessToken(
  cfg: PayHereConfig = getPayHereConfig()
): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt - 60_000 > now) {
    return tokenCache.token;
  }

  if (!cfg.appId || !cfg.appSecret) {
    throw new Error(
      'PayHere App ID/Secret not configured. Set PAYHERE_APP_ID and ' +
      'PAYHERE_APP_SECRET in the backend environment (create an App in the ' +
      'PayHere Business dashboard → Settings → Integrations).'
    );
  }

  const basic = Buffer.from(`${cfg.appId}:${cfg.appSecret}`).toString('base64');
  const url = `${getApiBase(cfg)}/merchant/v1/oauth/token`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`PayHere OAuth failed (${res.status}): ${txt}`);
  }

  const data = await res.json() as { access_token: string; expires_in?: number };
  const expiresInMs = (data.expires_in ?? 600) * 1000;
  tokenCache = { token: data.access_token, expiresAt: now + expiresInMs };
  return data.access_token;
}

/**
 * Looks up payment(s) for an order on PayHere's side. Returns the most recent
 * payment row, or null when no payment has been attempted yet.
 *
 * `status` is a string like "RECEIVED" / "PENDING" / "CANCELLED" / "FAILED" /
 * "CHARGEDBACK" / "REFUNDED". We map these into our internal enum.
 */
export interface RetrievedPayment {
  paymentId: string | null;
  orderId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'CHARGEDBACK' | 'REFUNDED';
  statusRaw: string;
  amount: number;
  currency: string;
  method: string | null;
  date: string | null;
  raw: unknown;
}

export async function retrievePaymentByOrder(
  orderId: string,
  cfg: PayHereConfig = getPayHereConfig()
): Promise<RetrievedPayment | null> {
  const token = await getMerchantAccessToken(cfg);
  const url = `${getApiBase(cfg)}/merchant/v1/payment/search?order_id=${encodeURIComponent(orderId)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`PayHere retrieval failed (${res.status}): ${txt}`);
  }

  const body = await res.json() as { status?: number; data?: any[] };

  // status=1 means lookup OK. Empty data array means no payment record yet.
  if (body.status !== 1 || !Array.isArray(body.data) || body.data.length === 0) {
    return null;
  }

  // PayHere returns an array; the most recent record is typically last but we
  // sort by date defensively so retries don't pick up a stale "CANCELLED" row.
  const sorted = [...body.data].sort(
    (a, b) => String(b.date ?? '').localeCompare(String(a.date ?? ''))
  );
  const row = sorted[0];

  return {
    paymentId: row.payment_id != null ? String(row.payment_id) : null,
    orderId: String(row.order_id ?? orderId),
    status: mapRetrievalStatus(String(row.status ?? '')),
    statusRaw: String(row.status ?? ''),
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? 'LKR'),
    method: row.payment_method ? String(row.payment_method) : null,
    date: row.date ? String(row.date) : null,
    raw: row,
  };
}

function mapRetrievalStatus(s: string): RetrievedPayment['status'] {
  switch (s.toUpperCase()) {
    case 'RECEIVED':
    case 'SUCCESS':
      return 'SUCCESS';
    case 'PENDING':
      return 'PENDING';
    case 'CANCELLED':
    case 'CANCELED':
      return 'CANCELLED';
    case 'FAILED':
      return 'FAILED';
    case 'CHARGEDBACK':
    case 'CHARGED_BACK':
      return 'CHARGEDBACK';
    case 'REFUNDED':
      return 'REFUNDED';
    default:
      return 'PENDING';
  }
}
