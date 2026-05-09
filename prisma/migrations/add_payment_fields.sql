-- Add payment-related fields to Order and OrderItem (idempotent).
-- Apply via: psql or Supabase SQL editor. Safe to run multiple times.

-- ── Order ─────────────────────────────────────────────────────────────────
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "totalAmount"   DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "currency"      TEXT NOT NULL DEFAULT 'LKR';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paidAt"        TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;

-- ── OrderItem ─────────────────────────────────────────────────────────────
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- ── PaymentStatus enum ────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'CHARGEDBACK');
  END IF;
END$$;

-- ── Payment table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Payment" (
  "id"               TEXT PRIMARY KEY,
  "orderId"          TEXT NOT NULL UNIQUE,
  "provider"         TEXT NOT NULL DEFAULT 'payhere',
  "payhereOrderId"   TEXT,
  "payherePaymentId" TEXT UNIQUE,
  "status"           "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "statusCode"       TEXT,
  "statusMessage"    TEXT,
  "method"           TEXT,
  "amount"           DOUBLE PRECISION NOT NULL,
  "currency"         TEXT NOT NULL DEFAULT 'LKR',
  "rawNotify"        JSONB,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment" ("status");
CREATE INDEX IF NOT EXISTS "Payment_payherePaymentId_idx" ON "Payment" ("payherePaymentId");

-- ── RLS (Supabase) ────────────────────────────────────────────────────────
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Payment_service_all" ON "Payment";
CREATE POLICY "Payment_service_all" ON "Payment"
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
