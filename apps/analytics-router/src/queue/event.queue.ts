/**
 * Single source of truth for queue names and job data types.
 * Import these constants wherever the queue is produced or consumed.
 */

/** BullMQ queue name for analytics event dispatch jobs. */
export const EVENT_QUEUE_NAME = 'analytics-events' as const;

/** The job name within the queue. */
export const DISPATCH_JOB_NAME = 'dispatch' as const;

/**
 * Typed job payload stored in BullMQ / Redis.
 * Contains everything the processor needs to build platform-specific payloads.
 */
export interface EventJobData {
  /** UUID from TrackingEvent.id — used as BullMQ jobId for deduplication. */
  trackingId: string;

  /** Standard event name (e.g., "Purchase", "ViewContent"). */
  eventName: string;

  /** Optional user identity — PII is hashed by each strategy before sending. */
  userData?: {
    email?: string;
    phone?: string;
    userId?: string;
    dateOfBirth?: string;
    country?: string;
  };

  /** Monetary / product data. */
  customData?: {
    value?: number;
    currency?: string;
    contentId?: string;
    contentType?: string;
    numItems?: number;
    orderId?: string;
  };

  /** ISO 8601 event timestamp. */
  eventTime: string;

  /** Forwarded client context. */
  clientIp?: string;
  userAgent?: string;
  pageUrl?: string;
  sessionId?: string;
}
