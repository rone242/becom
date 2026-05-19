import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TrackEventDto } from './dto/track-event.dto';
import { EVENT_QUEUE_NAME, EventJobData } from '../queue/event.queue';
import { v4 as uuid } from 'uuid';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(EVENT_QUEUE_NAME) private readonly eventQueue: Queue,
  ) {}

  /**
   * Ingests a raw frontend event:
   *
   * 1. Generate a deduplication ID (eventId) for idempotency
   * 2. Write a lightweight TrackingEvent row (status: QUEUED) — fast insert, no joins
   * 3. Push the job to BullMQ — returns in microseconds
   * 4. Return the trackingId to the caller (included in 202 response)
   *
   * The entire method is designed to complete in < 5ms under normal conditions.
   * All heavy platform API calls happen asynchronously in EventProcessor.
   */
  async ingest(dto: TrackEventDto): Promise<{ trackingId: string }> {
    const trackingId = uuid();
    const eventTime = dto.eventTime
      ? new Date(dto.eventTime)
      : new Date();

    // ── Step 1: Lightweight DB audit log ──────────────────────────────────
    // We use createMany-equivalent — a single non-blocking insert with
    // minimal fields to keep the Neon DB compute cost near-zero.
    await this.prisma.trackingEvent.create({
      data: {
        id: trackingId,
        eventName: dto.eventName,
        userId: dto.userData?.userId ?? null,
        sessionId: dto.sessionId ?? null,
        payload: dto as unknown as Prisma.InputJsonValue,
        status: 'QUEUED',
        createdAt: eventTime,
      },
    });

    // ── Step 2: Enqueue to BullMQ (non-blocking) ──────────────────────────
    const jobData: EventJobData = {
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

    await this.eventQueue.add('dispatch', jobData, {
      jobId: trackingId, // Deduplication key — prevents double-processing on retries
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2_000, // 2s → 4s → 8s
      },
      removeOnComplete: { count: 500 }, // Keep last 500 completed for inspection
      removeOnFail: { count: 200 },     // Keep last 200 failed for debugging
    });

    this.logger.log(
      `Event queued: ${dto.eventName} [trackingId=${trackingId}]`,
    );

    return { trackingId };
  }

  /**
   * Update the status of a tracking event after processing.
   * Called by EventProcessor after all strategies complete.
   */
  async updateStatus(
    trackingId: string,
    status: 'DELIVERED' | 'FAILED',
  ): Promise<void> {
    await this.prisma.trackingEvent.updateMany({
      where: { id: trackingId },
      data: { status },
    });
  }
}
