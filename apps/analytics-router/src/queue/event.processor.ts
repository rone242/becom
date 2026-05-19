import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Job } from 'bullmq';
import { AnalyticsPlatform } from '@prisma/client';
import { EVENT_QUEUE_NAME, EventJobData } from './event.queue';
import { IntegrationService } from '../integration/integration.service';
import { EventService } from '../event/event.service';
import { CounterService } from '../counter/counter.service';
import {
  FACEBOOK_CAPI_STRATEGY,
  GOOGLE_ANALYTICS_4_STRATEGY,
  TIKTOK_CAPI_STRATEGY,
} from '../strategies/strategy.tokens';
import { AnalyticsStrategy } from '../strategies/analytics-strategy.interface';

/**
 * Registry mapping AnalyticsPlatform enum values → injection tokens.
 *
 * This is the heart of the Strategy pattern:
 *   - Adding a new platform = add a new entry here + implement the strategy.
 *   - The processor NEVER needs to know about concrete strategy implementations.
 *   - Strategies are resolved at runtime via ModuleRef.get() — fully decoupled.
 */
const PLATFORM_STRATEGY_MAP: Record<AnalyticsPlatform, symbol> = {
  [AnalyticsPlatform.FACEBOOK_CAPI]:       FACEBOOK_CAPI_STRATEGY,
  [AnalyticsPlatform.GOOGLE_ANALYTICS_4]:  GOOGLE_ANALYTICS_4_STRATEGY,
  [AnalyticsPlatform.TIKTOK_CAPI]:         TIKTOK_CAPI_STRATEGY,
};

/**
 * BullMQ Worker/Processor — consumes jobs from the analytics-events queue.
 *
 * Execution flow for each job:
 *   1. Load all active integrations (Redis L1 → Prisma L2 fallback)
 *   2. For each active platform, resolve its Strategy via ModuleRef
 *   3. Execute the strategy's dispatch() — native fetch, no SDKs
 *   4. On success: update Redis counter via CounterService
 *   5. Update TrackingEvent status in DB (DELIVERED or FAILED)
 *
 * Retry policy (configured in EventService.ingest):
 *   - 3 attempts with exponential backoff: 2s → 4s → 8s
 */
@Processor(EVENT_QUEUE_NAME, {
  concurrency: 5, // Process up to 5 jobs in parallel per worker instance
})
export class EventProcessor extends WorkerHost {
  private readonly logger = new Logger(EventProcessor.name);

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly integrationService: IntegrationService,
    private readonly eventService: EventService,
    private readonly counterService: CounterService,
  ) {
    super();
  }

  async process(job: Job<EventJobData>): Promise<void> {
    const { trackingId, eventName, userData } = job.data;
    this.logger.log(
      `Processing job [${job.id}] event=${eventName} tracking=${trackingId}`,
    );

    const results: { platform: string; success: boolean; error?: string }[] = [];

    // ── Iterate over all known platforms ────────────────────────────────────
    const platforms = Object.values(AnalyticsPlatform) as AnalyticsPlatform[];

    await Promise.allSettled(
      platforms.map(async (platform) => {
        // ── Load config: Redis L1 → Prisma L2 ─────────────────────────────
        const config = await this.integrationService.findByPlatform(platform);

        // Skip if not configured or explicitly disabled
        if (!config || !config.isActive) {
          this.logger.debug(`Skipping inactive platform: ${platform}`);
          return;
        }

        // ── Resolve strategy at runtime (Strategy Pattern via ModuleRef) ───
        const token = PLATFORM_STRATEGY_MAP[platform];
        let strategy: AnalyticsStrategy;
        try {
          strategy = this.moduleRef.get<AnalyticsStrategy>(token, { strict: false });
        } catch {
          this.logger.error(`No strategy registered for platform: ${platform}`);
          results.push({ platform, success: false, error: 'No strategy found' });
          return;
        }

        // ── Execute strategy dispatch ──────────────────────────────────────
        try {
          await strategy.execute(job.data, config.credentials as Record<string, string>);
          this.logger.log(`✓ Dispatched to ${platform} [trackingId=${trackingId}]`);
          results.push({ platform, success: true });

          // ── Redis-first counter update on successful purchase ────────────
          if (eventName === 'Purchase' && userData?.userId) {
            await this.counterService.onPurchaseSuccess(userData.userId);
          }
        } catch (err) {
          const error = (err as Error).message;
          this.logger.warn(`✗ Failed dispatch to ${platform}: ${error}`);
          results.push({ platform, success: false, error });
        }
      }),
    );

    // ── Update audit record ──────────────────────────────────────────────
    const allSucceeded = results.every((r) => r.success);
    const anySucceeded = results.some((r) => r.success);
    const finalStatus = results.length === 0
      ? 'DELIVERED'  // No active integrations — event "consumed" successfully
      : allSucceeded
        ? 'DELIVERED'
        : anySucceeded
          ? 'DELIVERED' // Partial success — treat as delivered
          : 'FAILED';

    await this.eventService.updateStatus(trackingId, finalStatus as 'DELIVERED' | 'FAILED');

    // Rethrow if all active platforms failed — triggers BullMQ retry
    if (results.length > 0 && !anySucceeded) {
      throw new Error(
        `All platform dispatches failed for trackingId=${trackingId}`,
      );
    }
  }
}
