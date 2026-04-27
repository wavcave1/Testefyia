-- Add structured studio location fields while preserving legacy columns
ALTER TABLE "studios"
  ADD COLUMN "addressLine1" TEXT,
  ADD COLUMN "addressLine2" TEXT,
  ADD COLUMN "postalCode" TEXT,
  ADD COLUMN "country" TEXT,
  ADD COLUMN "publicLocationLabel" TEXT,
  ADD COLUMN "arrivalInstructions" TEXT,
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION;

-- Backfill from existing legacy fields for compatibility
UPDATE "studios"
SET
  "addressLine1" = COALESCE(NULLIF("addressLine1", ''), NULLIF("address", '')),
  "postalCode" = COALESCE(NULLIF("postalCode", ''), NULLIF("zip", '')),
  "latitude" = COALESCE("latitude", "lat"),
  "longitude" = COALESCE("longitude", "lng")
WHERE
  "addressLine1" IS NULL
  OR "postalCode" IS NULL
  OR "latitude" IS NULL
  OR "longitude" IS NULL;
