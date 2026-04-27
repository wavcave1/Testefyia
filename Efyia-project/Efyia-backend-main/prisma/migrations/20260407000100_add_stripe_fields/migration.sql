-- Add extended Stripe Connect status fields
ALTER TABLE "studios" ADD COLUMN IF NOT EXISTS "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "studios" ADD COLUMN IF NOT EXISTS "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "studios" ADD COLUMN IF NOT EXISTS "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "studios" ADD COLUMN IF NOT EXISTS "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "studios" ADD COLUMN IF NOT EXISTS "stripeOnboardingStartedAt" TIMESTAMP;
ALTER TABLE "studios" ADD COLUMN IF NOT EXISTS "stripeActivatedAt" TIMESTAMP;

-- Log table for Stripe events (idempotency + replay safety)
CREATE TABLE IF NOT EXISTS "stripe_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "stripe_event_id" TEXT UNIQUE NOT NULL,
  "event_type" TEXT NOT NULL,
  "account_id" TEXT,
  "processed" BOOLEAN DEFAULT false,
  "payload" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW()
);
