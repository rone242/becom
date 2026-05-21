-- Migration: add all missing columns and tables to match current schema
-- Generated: 2026-05-21 (fixed: safe enum creation with DO blocks)

-- ─── New Enums (safe: skip if already exists) ────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "CustomerTier" AS ENUM ('REGULAR', 'VIP', 'PLATINUM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AnalyticsPlatform" AS ENUM ('FACEBOOK_CAPI', 'GOOGLE_ANALYTICS_4', 'TIKTOK_CAPI');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Alter users: add tier column ────────────────────────────────────────────

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tier" "CustomerTier" NOT NULL DEFAULT 'REGULAR';

-- ─── Alter orders: add courier tracking columns ───────────────────────────────

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "trackingCode"   TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "consignmentId"  INTEGER;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "courierStatus"  TEXT;

-- ─── Alter site_settings: add all missing columns ────────────────────────────

ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "brandColor"          TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "faviconUrl"          TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "advancePayment"      JSONB;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "paymentMethods"      JSONB;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "invoiceSettings"     JSONB;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "rewardPoints"        JSONB;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "smsSettings"         JSONB;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "courierSettings"     JSONB;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "fraudCheckApi"       JSONB;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "socialLogin"         JSONB;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "chatManagement"      JSONB;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "facebookCatalog"     JSONB;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "orderSettings"       JSONB;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "productSettings"     JSONB;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "currencyCountry"     JSONB;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "domainSettings"      JSONB;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "blogSettings"        JSONB;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "googleSearchConsole" JSONB;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "manageOffers"        JSONB;

-- ─── Create integration_settings table ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS "integration_settings" (
    "id"          TEXT NOT NULL,
    "platform"    "AnalyticsPlatform" NOT NULL,
    "isActive"    BOOLEAN NOT NULL DEFAULT false,
    "credentials" JSONB NOT NULL DEFAULT '{}',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "integration_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "integration_settings_platform_key"
  ON "integration_settings"("platform");

-- ─── Create tracking_events table ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "tracking_events" (
    "id"        TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "userId"    TEXT,
    "sessionId" TEXT,
    "payload"   JSONB NOT NULL,
    "status"    TEXT NOT NULL DEFAULT 'QUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tracking_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "tracking_events_userId_idx"    ON "tracking_events"("userId");
CREATE INDEX IF NOT EXISTS "tracking_events_eventName_idx" ON "tracking_events"("eventName");
CREATE INDEX IF NOT EXISTS "tracking_events_createdAt_idx" ON "tracking_events"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tracking_events_userId_fkey'
  ) THEN
    ALTER TABLE "tracking_events"
      ADD CONSTRAINT "tracking_events_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
