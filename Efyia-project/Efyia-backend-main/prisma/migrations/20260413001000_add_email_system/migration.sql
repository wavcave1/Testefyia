-- CreateEnum
CREATE TYPE "EmailDomainStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailDnsStatus" AS ENUM ('PENDING', 'PARTIAL', 'VERIFIED', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'DROPPED', 'FAILED', 'OPENED', 'CLICKED');

-- CreateTable
CREATE TABLE "email_domains" (
    "id" SERIAL NOT NULL,
    "studio_id" INTEGER NOT NULL,
    "created_by_user_id" INTEGER NOT NULL,
    "domain" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mailgun',
    "provider_domain_id" TEXT,
    "domain_status" "EmailDomainStatus" NOT NULL DEFAULT 'PENDING',
    "dns_status" "EmailDnsStatus" NOT NULL DEFAULT 'PENDING',
    "setup_status" TEXT NOT NULL DEFAULT 'pending_dns',
    "required_dns" JSONB,
    "verification_meta" JSONB,
    "last_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_aliases" (
    "id" SERIAL NOT NULL,
    "domain_id" INTEGER NOT NULL,
    "local_part" TEXT NOT NULL,
    "full_email" TEXT NOT NULL,
    "forward_to" TEXT NOT NULL,
    "provider_alias_id" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_events" (
    "id" SERIAL NOT NULL,
    "domain_id" INTEGER,
    "alias_id" INTEGER,
    "actor_user_id" INTEGER,
    "studio_id" INTEGER,
    "event_type" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "provider_event_id" TEXT,
    "delivery_status" "EmailDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "error_message" TEXT,
    "metadata" JSONB,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_domains_domain_key" ON "email_domains"("domain");

-- CreateIndex
CREATE INDEX "email_domains_studio_id_idx" ON "email_domains"("studio_id");

-- CreateIndex
CREATE INDEX "email_domains_created_by_user_id_idx" ON "email_domains"("created_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_aliases_full_email_key" ON "email_aliases"("full_email");

-- CreateIndex
CREATE UNIQUE INDEX "email_aliases_domain_id_local_part_key" ON "email_aliases"("domain_id", "local_part");

-- CreateIndex
CREATE INDEX "email_aliases_created_by_user_id_idx" ON "email_aliases"("created_by_user_id");

-- CreateIndex
CREATE INDEX "email_events_domain_id_idx" ON "email_events"("domain_id");

-- CreateIndex
CREATE INDEX "email_events_alias_id_idx" ON "email_events"("alias_id");

-- CreateIndex
CREATE INDEX "email_events_actor_user_id_idx" ON "email_events"("actor_user_id");

-- CreateIndex
CREATE INDEX "email_events_studio_id_idx" ON "email_events"("studio_id");

-- AddForeignKey
ALTER TABLE "email_domains" ADD CONSTRAINT "email_domains_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_domains" ADD CONSTRAINT "email_domains_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_aliases" ADD CONSTRAINT "email_aliases_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "email_domains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_aliases" ADD CONSTRAINT "email_aliases_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "email_domains"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_alias_id_fkey" FOREIGN KEY ("alias_id") REFERENCES "email_aliases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
