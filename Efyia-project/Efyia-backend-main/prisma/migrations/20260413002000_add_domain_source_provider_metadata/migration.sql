-- CreateEnum
CREATE TYPE "DomainSourceType" AS ENUM ('EXTERNAL_CONNECTED', 'EFYIA_REGISTERED');

-- CreateEnum
CREATE TYPE "DomainProviderType" AS ENUM ('MANUAL', 'RESELLER', 'CLOUDFLARE', 'OTHER');

-- CreateEnum
CREATE TYPE "DomainRegistrationStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING', 'ACTIVE', 'TRANSFER_PENDING', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailEligibilityStatus" AS ENUM ('PENDING', 'ELIGIBLE', 'INELIGIBLE');

-- AlterTable
ALTER TABLE "email_domains"
  ADD COLUMN "source_type" "DomainSourceType" NOT NULL DEFAULT 'EXTERNAL_CONNECTED',
  ADD COLUMN "provider_type" "DomainProviderType" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "registration_status" "DomainRegistrationStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
  ADD COLUMN "verification_status" "EmailDomainStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "email_eligibility_status" "EmailEligibilityStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "alias_eligibility_status" "EmailEligibilityStatus" NOT NULL DEFAULT 'PENDING';
