-- Split payment flow support: deposit + final payment legs per booking

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionPaymentType') THEN
    CREATE TYPE "TransactionPaymentType" AS ENUM ('FULL', 'DEPOSIT', 'FINAL');
  END IF;
END $$;

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "finalPaymentIntentId" TEXT,
  ADD COLUMN IF NOT EXISTS "finalPaymentPaid" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "paymentType" "TransactionPaymentType" NOT NULL DEFAULT 'FULL';

DROP INDEX IF EXISTS "transactions_bookingId_key";
