import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class StatsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StatsService.name);
  private syncInterval?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  onModuleInit() {
    // Start background sync task every 5 seconds
    this.syncInterval = setInterval(() => {
      this.syncStatsToDb().catch((err) => {
        this.logger.error(`Error in stats background sync task: ${(err as Error).message}`);
      });
    }, 5000);
  }

  onModuleDestroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  }

  /**
   * Buffer sent event count to Redis.
   * Fallback to direct DB writes if Redis is unavailable.
   */
  async recordSent(platform: string): Promise<void> {
    const date = this.today();
    try {
      const client = this.redisService.rawClient;
      if (!this.redisService.isReady || !client) {
        // Fallback directly to Database
        await this.prisma.analyticsDaily.upsert({
          where: { date_platform: { date, platform } },
          create: { date, platform, sent: 1, failed: 0 },
          update: { sent: { increment: 1 } },
        });
        return;
      }

      // Buffer in Redis hash
      await client.hincrby(`stats:daily:${date}`, `${platform}:sent`, 1);
      // Track this date as pending synchronization
      await client.sadd('stats:pending_dates', date);
    } catch (err) {
      this.logger.warn(`Failed to record sent stat for ${platform}: ${(err as Error).message}`);
    }
  }

  /**
   * Buffer failed event count to Redis.
   * Fallback to direct DB writes if Redis is unavailable.
   */
  async recordFailed(platform: string): Promise<void> {
    const date = this.today();
    try {
      const client = this.redisService.rawClient;
      if (!this.redisService.isReady || !client) {
        // Fallback directly to Database
        await this.prisma.analyticsDaily.upsert({
          where: { date_platform: { date, platform } },
          create: { date, platform, sent: 0, failed: 1 },
          update: { failed: { increment: 1 } },
        });
        return;
      }

      // Buffer in Redis hash
      await client.hincrby(`stats:daily:${date}`, `${platform}:failed`, 1);
      // Track this date as pending synchronization
      await client.sadd('stats:pending_dates', date);
    } catch (err) {
      this.logger.warn(`Failed to record failed stat for ${platform}: ${(err as Error).message}`);
    }
  }

  /**
   * Periodically flush buffered event counts from Redis to PostgreSQL.
   * Uses atomic rename and custom recovery rollback to guarantee no data loss.
   */
  async syncStatsToDb(): Promise<void> {
    if (!this.redisService.isReady) return;
    const client = this.redisService.rawClient;
    if (!client) return;

    const pendingDates = await client.smembers('stats:pending_dates');
    if (!pendingDates || pendingDates.length === 0) return;

    for (const date of pendingDates) {
      const syncId = uuid();
      const originalKey = `stats:daily:${date}`;
      const syncKey = `${originalKey}:sync:${syncId}`;

      try {
        // Atomic rename of original key.
        // Fails with ERR if originalKey doesn't exist (e.g. no new events since last sync).
        await client.rename(originalKey, syncKey);
      } catch {
        // Key doesn't exist in Redis.
        // Confirm if it is completely gone to clean up pending_dates.
        const exists = await client.exists(originalKey);
        if (!exists) {
          await client.srem('stats:pending_dates', date);
        }
        continue;
      }

      try {
        const data = await client.hgetall(syncKey);
        if (data && Object.keys(data).length > 0) {
          const platformStats: Record<string, { sent: number; failed: number }> = {};

          for (const [field, valStr] of Object.entries(data)) {
            const val = parseInt(valStr, 10) || 0;
            if (val <= 0) continue;

            const [platform, type] = field.split(':');
            if (!platform || !type) continue;

            if (!platformStats[platform]) {
              platformStats[platform] = { sent: 0, failed: 0 };
            }

            if (type === 'sent') {
              platformStats[platform].sent += val;
            } else if (type === 'failed') {
              platformStats[platform].failed += val;
            }
          }

          // Apply aggregated counts to PostgreSQL in transactions or direct upserts
          for (const [platform, stats] of Object.entries(platformStats)) {
            if (stats.sent === 0 && stats.failed === 0) continue;

            await this.prisma.analyticsDaily.upsert({
              where: { date_platform: { date, platform } },
              create: { date, platform, sent: stats.sent, failed: stats.failed },
              update: {
                sent: { increment: stats.sent },
                failed: { increment: stats.failed },
              },
            });
          }
        }

        // Successfully synced. Clean up temporary sync key.
        await client.del(syncKey);

        // Remove date from pending_dates if key hasn't been recreated in the meantime
        const exists = await client.exists(originalKey);
        if (!exists) {
          await client.srem('stats:pending_dates', date);
        }
      } catch (err) {
        this.logger.error(`Failed to sync stats to Postgres for ${date}: ${(err as Error).message}`);
        // Database is likely offline/unreachable. Restore syncKey contents back to originalKey so we retry next loop.
        try {
          const syncExists = await client.exists(syncKey);
          if (syncExists) {
            const data = await client.hgetall(syncKey);
            for (const [field, valStr] of Object.entries(data)) {
              const val = parseInt(valStr, 10) || 0;
              if (val > 0) {
                await client.hincrby(originalKey, field, val);
              }
            }
            await client.del(syncKey);
          }
        } catch (restoreErr) {
          this.logger.error(`Critical: Failed to restore synced stats for ${date}: ${(restoreErr as Error).message}`);
        }
      }
    }
  }

  /**
   * Query daily stats for a custom date range.
   * Merges database records with live, un-synced buffered Redis counters in real-time.
   */
  async getStats(from: string, to: string) {
    const rows = await this.prisma.analyticsDaily.findMany({
      where: {
        date: { gte: from, lte: to },
      },
      orderBy: [{ date: 'asc' }, { platform: 'asc' }],
    });

    // Merge in-memory / buffered Redis stats for any date within the requested range
    if (this.redisService.isReady) {
      const client = this.redisService.rawClient;
      if (client) {
        try {
          const pendingDates = await client.smembers('stats:pending_dates');
          const datesInRange = pendingDates.filter((d) => d >= from && d <= to);

          for (const date of datesInRange) {
            const redisData = await client.hgetall(`stats:daily:${date}`);
            if (redisData && Object.keys(redisData).length > 0) {
              const parsed: Record<string, { sent: number; failed: number }> = {};
              for (const [field, valStr] of Object.entries(redisData)) {
                const val = parseInt(valStr, 10) || 0;
                if (val <= 0) continue;

                const [platform, type] = field.split(':');
                if (!platform || !type) continue;

                if (!parsed[platform]) parsed[platform] = { sent: 0, failed: 0 };
                if (type === 'sent') parsed[platform].sent += val;
                if (type === 'failed') parsed[platform].failed += val;
              }

              for (const [platform, stats] of Object.entries(parsed)) {
                const existingRow = rows.find((r) => r.date === date && r.platform === platform);
                if (existingRow) {
                  existingRow.sent += stats.sent;
                  existingRow.failed += stats.failed;
                } else {
                  rows.push({
                    id: `redis-${date}-${platform}-${uuid().slice(0, 8)}`,
                    date,
                    platform,
                    sent: stats.sent,
                    failed: stats.failed,
                    updatedAt: new Date(),
                  } as any);
                }
              }
            }
          }

          // Re-sort rows if new ones were added from Redis
          rows.sort((a, b) => {
            const dateCompare = a.date.localeCompare(b.date);
            if (dateCompare !== 0) return dateCompare;
            return a.platform.localeCompare(b.platform);
          });
        } catch (err) {
          this.logger.warn(`Failed to merge live Redis stats: ${(err as Error).message}`);
        }
      }
    }

    // Platform rows (excluding TOTAL counter)
    const platformRows = rows.filter((r) => r.platform !== 'TOTAL');
    // TOTAL rows (received at ingest layer)
    const totalRows = rows.filter((r) => r.platform === 'TOTAL');

    const total = platformRows.reduce(
      (acc, r) => ({ sent: acc.sent + r.sent, failed: acc.failed + r.failed }),
      { sent: 0, failed: 0 },
    );

    const received = totalRows.reduce((acc, r) => acc + r.sent, 0);

    // Build daily totals for bar chart — aggregate across all platforms per date
    const dailyMap: Record<string, { date: string; received: number; sent: number; failed: number }> = {};
    rows.forEach((r) => {
      if (!dailyMap[r.date]) dailyMap[r.date] = { date: r.date, received: 0, sent: 0, failed: 0 };
      if (r.platform === 'TOTAL') {
        dailyMap[r.date].received += r.sent; // 'sent' column holds received count
      } else {
        dailyMap[r.date].sent += r.sent;
        dailyMap[r.date].failed += r.failed;
      }
    });
    const dailyTotals = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    return { from, to, received, total, rows: platformRows, dailyTotals };
  }
}
