CREATE TABLE IF NOT EXISTS "studio_schedules" (
  "id" SERIAL PRIMARY KEY,
  "studioId" INTEGER REFERENCES "studios"("id"),
  "dayOfWeek" INTEGER NOT NULL,
  "openTime" TEXT NOT NULL,
  "closeTime" TEXT NOT NULL,
  "isOpen" BOOLEAN NOT NULL DEFAULT true,
  UNIQUE ("studioId", "dayOfWeek")
);

CREATE TABLE IF NOT EXISTS "booking_files" (
  "id" SERIAL PRIMARY KEY,
  "bookingId" INTEGER REFERENCES "bookings"("id"),
  "uploadedBy" INTEGER NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileSize" INTEGER,
  "mimeType" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "booking_messages" (
  "id" SERIAL PRIMARY KEY,
  "bookingId" INTEGER REFERENCES "bookings"("id"),
  "senderId" INTEGER REFERENCES "users"("id"),
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "depositAmount" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "depositPercent" INTEGER,
  ADD COLUMN IF NOT EXISTS "depositPaid" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "finalPaymentDue" TEXT;
