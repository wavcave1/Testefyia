-- Track a user's saved card for account settings and future reuse
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "stripePaymentMethodId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripePaymentMethodBrand" TEXT,
  ADD COLUMN IF NOT EXISTS "stripePaymentMethodLast4" TEXT,
  ADD COLUMN IF NOT EXISTS "stripePaymentMethodExpMonth" INTEGER,
  ADD COLUMN IF NOT EXISTS "stripePaymentMethodExpYear" INTEGER,
  ADD COLUMN IF NOT EXISTS "stripePaymentMethodSavedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "stripePaymentMethodStudioId" INTEGER;
