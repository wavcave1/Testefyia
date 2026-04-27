-- Add payment method tracking for auto-charge functionality

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "stripePaymentMethodId" TEXT;
