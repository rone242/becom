import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Job } from 'bullmq';
import { AnalyticsPlatform } from '@prisma/client';
import { EVENT_QUEUE_NAME } from './event.queue';
import { IntegrationService } from '../integration/integration.service';
import { EventService } from '../event/event.service';
import { CounterService } from '../counter/counter.service';
import { StatsService } from '../stats/stats.service';
import {
  FACEBOOK_CAPI_STRATEGY,
  GOOGLE_ANALYTICS_4_STRATEGY,
  TIKTOK_CAPI_STRATEGY,
} from '../strategies/strategy.tokens';
import { AnalyticsStrategy } from '../strategies/analytics-strategy.interface';
import { EventJobData } from './event.queue';

const PLATFORM_STRATEGY_MAP: Record<AnalyticsPlatform, symbol> = {
  [AnalyticsPlatform.FACEBOOK_CAPI]:      FACEBOOK_CAPI_STRATEGY,
  [AnalyticsPlatform.GOOGLE_ANALYTICS_4]: GOOGLE_ANALYTICS_4_STRATEGY,
  [AnalyticsPlatform.TIKTOK_CAPI]:        TIKTOK_CAPI_STRATEGY,
};

@Processor(EVENT_QUEUE_NAME, { concurrency: 5 })
export class EventProcessor extends WorkerHost {
  private readonly logger = new Logger(EventProcessor.name);

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly integrationService: IntegrationService,
    private readonly eventService: EventService,
    private readonly counterService: CounterService,
    private readonly statsService: StatsService,
  ) {
    super();
  }

  async process(job: Job<{ trackingId: string }>): Promise<void> {
    const { trackingId } = job.data;

    // ── Fetch event data from Redis ────────────────────────────────────────
    const eventData = await this.eventService.fetchEventData(trackingId);
    if (!eventData) {
      // Event expired from Redis (TTL elapsed) — nothing to do
      this.logger.warn(`Event expired or not found in Redis [trackingId=${trackingId}]`);
      return;
    }

    const { eventName, userData } = eventData;
    this.logger.log(`Processing: ${eventName} [trackingId=${trackingId}]`);

    const platforms = Object.values(AnalyticsPlatform) as AnalyticsPlatform[];
    let anySent = false;

    await Promise.allSettled(
      platforms.map(async (platform) => {
        const config = await this.integrationService.findByPlatform(platform);
        if (!config?.isActive) return;

        const token = PLATFORM_STRATEGY_MAP[platform];
        let strategy: AnalyticsStrategy;
        try {
          strategy = this.moduleRef.get<AnalyticsStrategy>(token, { strict: false });
        } catch {
          this.logger.error(`No strategy for platform: ${platform}`);
          await this.statsService.recordFailed(platform);
          return;
        }

        try {
          await strategy.execute(eventData as unknown as EventJobData, config.credentials as Record<string, string>);
          this.logger.log(`✓ Sent to ${platform} [${trackingId}]`);
          anySent = true;

          // Save daily sent stat
          await this.statsService.recordSent(platform);

          // Redis-first purchase counter
          if (eventName === 'Purchase' && userData?.userId) {
            await this.counterService.onPurchaseSuccess(userData.userId);
          }
        } catch (err) {
          this.logger.warn(`✗ Failed ${platform}: ${(err as Error).message}`);
          // Save daily failed stat — event data auto-expires from Redis
          await this.statsService.recordFailed(platform);
        }
      }),
    );

    // ── Delete event from Redis after processing ───────────────────────────
    // Whether sent or not, clean up memory. Failed events already expired via TTL.
    await this.eventService.deleteEventData(trackingId);
  }
}
