import { EventJobData } from '../queue/event.queue';

/**
 * Generic interface all platform strategy implementations must satisfy.
 *
 * - `execute()` receives the job data (event payload) and the platform's
 *   credentials from the DB (decrypted at call time).
 * - Credentials shape is platform-specific — each strategy casts internally.
 * - Throw an Error on dispatch failure — BullMQ will retry automatically.
 */
export interface AnalyticsStrategy {
  execute(
    jobData: EventJobData,
    credentials: Record<string, string>,
  ): Promise<void>;
}
