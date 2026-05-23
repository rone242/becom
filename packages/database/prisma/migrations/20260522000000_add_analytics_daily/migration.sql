-- Drop old TrackingEvent table (events now stored in Redis with TTL)
DROP TABLE IF EXISTS "tracking_events";

-- Add AnalyticsDaily table for daily sent/failed event stats per platform
CREATE TABLE IF NOT EXISTS "analytics_daily" (
    "id"        TEXT NOT NULL,
    "date"      TEXT NOT NULL,        -- "2026-05-22"
    "platform"  TEXT NOT NULL,        -- "FACEBOOK_CAPI" | "GOOGLE_ANALYTICS_4" | "TIKTOK_CAPI"
    "sent"      INTEGER NOT NULL DEFAULT 0,
    "failed"    INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_daily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "analytics_daily_date_platform_key"
  ON "analytics_daily"("date", "platform");

CREATE INDEX IF NOT EXISTS "analytics_daily_date_idx"
  ON "analytics_daily"("date");
