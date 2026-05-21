-- Migration: add all missing columns and tables to match current schema
-- Generated: 2026-05-21

-- ─── New Enums ────────────────────────────────────────────────────────────────

CREATE TYPE "CustomerTier" AS ENUM ('REGULAR', 'VIP', 'PLATINUM');
CREATE TYPE "AnalyticsPlatform" AS ENUM ('FACEBOOK_CAPI', 'GOOGLE_ANALYTICS_4', 'TIKTOK_CAPI');

-- ─── Alter users: add tier column ────────────────────────────────────────────

ALTER TABLE "users" ADD COLUMN "tier" "CustomerTier" NOT NULL DEFAULT 'REGULAR';

-- ─── Alter orders: add courier tracking columns ───────────────────────────────

ALTER TABLE "orders" ADD COLUMN "trackingCode" TEXT;
ALTER TABLE "orders" ADD COLUMN "consignmentId" INTEGER;
ALTER TABLE "orders" ADD COLUMN "courierStatus" TEXT;

-- ─── Alter site_settings: add all missing columns ────────────────────────────

ALTER TABLE "site_settings" ADD COLUMN "brandColor"         TEXT;
ALTER TABLE "site_settings" ADD COLUMN "faviconUrl"         TEXT;
ALTER TABLE "site_settings" ADD COLUMN "advancePayment"     JSONB;
ALTER TABLE "site_settings" ADD COLUMN "paymentMethods"     JSONB;
ALTER TABLE "site_settings" ADD COLUMN "invoiceSettings"    JSONB;
ALTER TABLE "site_settings" ADD COLUMN "rewardPoints"       JSONB;
ALTER TABLE "site_settings" ADD COLUMN "smsSettings"        JSONB;
ALTER TABLE "site_settings" ADD COLUMN "courierSettings"    JSONB;
ALTER TABLE "site_settings" ADD COLUMN "fraudCheckApi"      JSONB;
ALTER TABLE "site_settings" ADD COLUMN "socialLogin"        JSONB;
ALTER TABLE "site_settings" ADD COLUMN "chatManagement"     JSONB;
ALTER TABLE "site_settings" ADD COLUMN "facebookCatalog"    JSONB;
ALTER TABLE "site_settings" ADD COLUMN "orderSettings"      JSONB;
ALTER TABLE "site_settings" ADD COLUMN "productSettings"    JSONB;
ALTER TABLE "site_settings" ADD COLUMN "currencyCountry"    JSONB;
ALTER TABLE "site_settings" ADD COLUMN "domainSettings"     JSONB;
ALTER TABLE "site_settings" ADD COLUMN "blogSettings"       JSONB;
ALTER TABLE "site_settings" ADD COLUMN "googleSearchConsole" JSONB;
ALTER TABLE "site_settings" ADD COLUMN "manageOffers"       JSONB;

-- ─── Create integration_settings table ───────────────────────────────────────

CREATE TABLE "integration_settings" (
    "id"          TEXT NOT NULL,
    "platform"    "AnalyticsPlatform" NOT NULL,
    "isActive"    BOOLEAN NOT NULL DEFAULT false,
    "credentials" JSONB NOT NULL DEFAULT '{}',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "integration_settings_platform_key" ON "integration_settings"("platform");

-- ─── Create tracking_events table ────────────────────────────────────────────

CREATE TABLE "tracking_events" (
    "id"        TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "userId"    TEXT,
    "sessionId" TEXT,
    "payload"   JSONB NOT NULL,
    "status"    TEXT NOT NULL DEFAULT 'QUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tracking_events_userId_idx"    ON "tracking_events"("userId");
CREATE INDEX "tracking_events_eventName_idx" ON "tracking_events"("eventName");
CREATE INDEX "tracking_events_createdAt_idx" ON "tracking_events"("createdAt");

-- AddForeignKey
ALTER TABLE "tracking_events"
    ADD CONSTRAINT "tracking_events_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
