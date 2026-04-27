-- Recovery migration: ensures all Stripe-related schema changes are applied
-- regardless of whether previous migrations succeeded or failed.
-- All statements use IF NOT EXISTS / exception handling and are safe to run repeatedly.

-- ── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "ConnectStatus" AS ENUM ('NOT_CONNECTED', 'PENDING', 'RESTRICTED', 'ACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Studios: Stripe Connect columns ──────────────────────────────────────────

ALTER TABLE "studios" ADD COLUMN IF NOT EXISTS "stripeConnectAccountId" TEXT;
ALTER TABLE "studios" ADD COLUMN IF NOT EXISTS "stripeConnectStatus" "ConnectStatus" NOT NULL DEFAULT 'NOT_CONNECTED';
ALTER TABLE "studios" ADD COLUMN IF NOT EXISTS "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "studios" ADD COLUMN IF NOT EXISTS "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "studios" ADD COLUMN IF NOT EXISTS "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "studios" ADD COLUMN IF NOT EXISTS "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "studios" ADD COLUMN IF NOT EXISTS "stripeOnboardingStartedAt" TIMESTAMP;
ALTER TABLE "studios" ADD COLUMN IF NOT EXISTS "stripeActivatedAt" TIMESTAMP;

-- ── Transactions ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "transactions" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "stripePaymentIntentId" TEXT NOT NULL,
    "stripeTransferId" TEXT,
    "stripeRefundId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "platformFee" DOUBLE PRECISION NOT NULL,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "studioId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "transactions_bookingId_key" ON "transactions"("bookingId");
CREATE UNIQUE INDEX IF NOT EXISTS "transactions_stripePaymentIntentId_key" ON "transactions"("stripePaymentIntentId");

DO $$ BEGIN
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_studioId_fkey"
    FOREIGN KEY ("studioId") REFERENCES "studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Availability blocks ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "availability_blocks" (
    "id" SERIAL NOT NULL,
    "studioId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "availability_blocks_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "availability_blocks" ADD CONSTRAINT "availability_blocks_studioId_fkey"
    FOREIGN KEY ("studioId") REFERENCES "studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Stripe events ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "stripe_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "stripe_event_id" TEXT UNIQUE NOT NULL,
  "event_type" TEXT NOT NULL,
  "account_id" TEXT,
  "processed" BOOLEAN DEFAULT false,
  "payload" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW()
);
