-- Track the Stripe Customer ID associated with the saved payment method.
-- Off-session reuse of a saved payment_method requires a customer on the
-- connected account; without it, setup_future_usage cannot be honoured.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
