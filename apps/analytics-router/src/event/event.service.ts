import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { RedisService } from '../redis/redis.service';
import { TrackEventDto } from './dto/track-event.dto';
import { EVENT_QUEUE_NAME, EventJobData } from '../queue/event.queue';
import { StatsService } from '../stats/stats.service';
import { v4 as uuid } from 'uuid';

const EVENT_TTL_SECONDS = 600; // 10 minutes

/**
 * Special platform key to track total events received at the ingest layer.
 * This lets the admin stats panel show non-zero counts even when no
 * third-party platforms are configured or active yet.
 */
const PLATFORM_TOTAL = 'TOTAL';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly statsService: StatsService,
    @InjectQueue(EVENT_QUEUE_NAME) private readonly eventQueue: Queue,
  ) {}

  /**
   * Ingests a raw frontend event:
   *
   * 1. Record +1 to TOTAL received count (admin stats always update)
   * 2. Generate a unique trackingId
   * 3. Store full event data in Redis with 10-min TTL
   * 4. Push a lightweight job to BullMQ (only trackingId)
   * 5. Return 202 immediately
   */
  async ingest(dto: TrackEventDto): Promise<{ trackingId: string }> {
    const trackingId = uuid();
    const eventTime = dto.eventTime ? new Date(dto.eventTime) : new Date();

    // ── Step 0: Count every received event regardless of platform config ──
    // recordSent('TOTAL') — uses 'sent' column to track received count so
    // the dashboard always shows incoming traffic even before platforms activate.
    await this.statsService.recordSent(PLATFORM_TOTAL);

    // ── Step 1: Store raw event in Redis with 10-min TTL ──────────────────
    const payload: EventJobData = {
      trackingId,
      eventName: dto.eventName,
      userData: dto.userData,
      customData: dto.customData,
      eventTime: eventTime.toISOString(),
      clientIp: dto.clientIp,
      userAgent: dto.userAgent,
      pageUrl: dto.pageUrl,
      sessionId: dto.sessionId,
    };
    await this.redis.set(`event:${trackingId}`, payload, EVENT_TTL_SECONDS);

    // ── Step 2: Enqueue lightweight job to BullMQ ─────────────────────────
    await this.eventQueue.add('dispatch', { trackingId }, {
      jobId: trackingId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 50 },
    });

    this.logger.log(`Event queued: ${dto.eventName} [trackingId=${trackingId}]`);
    return { trackingId };
  }

  /**
   * Fetch raw event data from Redis.
   * Returns null if event has expired (TTL elapsed) or already processed.
   */
  async fetchEventData(trackingId: string): Promise<EventJobData | null> {
    return this.redis.get<EventJobData>(`event:${trackingId}`);
  }

  /**
   * Delete event from Redis after successful processing.
   * Frees memory immediately instead of waiting for TTL.
   */
  async deleteEventData(trackingId: string): Promise<void> {
    await this.redis.del(`event:${trackingId}`);
  }
}
