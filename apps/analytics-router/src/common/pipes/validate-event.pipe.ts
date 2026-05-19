import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  Logger,
  PipeTransform,
} from '@nestjs/common';
import { TrackEventDto, EventName } from '../../event/dto/track-event.dto';

/**
 * ValidateEventPipe — semantic validation beyond class-validator decorators.
 *
 * class-validator on TrackEventDto handles structural/type validation.
 * This pipe handles BUSINESS RULE validation:
 *
 *  1. Purchase events MUST include customData.value > 0
 *  2. eventTime (if supplied) must be within the allowed platform window:
 *       - Meta CAPI: 7 days back, 1 hour forward
 *       - TikTok:    28 days back (we enforce the stricter Meta limit here)
 *  3. sessionId OR userData.userId must be present (at least one identifier)
 *
 * Applied per-route via @UsePipes() on the event controller so it only
 * runs for the POST /api/event endpoint, keeping overhead near-zero for
 * other routes.
 */
@Injectable()
export class ValidateEventPipe implements PipeTransform<TrackEventDto> {
  private readonly logger = new Logger(ValidateEventPipe.name);

  /** Maximum age of an event timestamp in milliseconds (7 days — Meta limit) */
  private static readonly MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;

  /** Maximum future offset allowed (1 hour grace for clock skew) */
  private static readonly MAX_FUTURE_MS = 60 * 60 * 1_000;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transform(value: TrackEventDto, _metadata: ArgumentMetadata): TrackEventDto {
    // ── Rule 1: Purchase events must carry a monetary value ─────────────────
    if (value.eventName === EventName.PURCHASE) {
      const v = value.customData?.value;
      if (v === undefined || v === null || v <= 0) {
        throw new BadRequestException(
          'Purchase events must include customData.value > 0',
        );
      }
      if (!value.customData?.currency) {
        throw new BadRequestException(
          'Purchase events must include customData.currency (e.g. "BDT")',
        );
      }
    }

    // ── Rule 2: At least one user identifier required ───────────────────────
    const hasUserId = Boolean(value.userData?.userId);
    const hasSession = Boolean(value.sessionId);
    if (!hasUserId && !hasSession) {
      throw new BadRequestException(
        'Either userData.userId or sessionId must be provided for attribution',
      );
    }

    // ── Rule 3: eventTime must be within the acceptable platform window ──────
    if (value.eventTime) {
      const eventMs = Date.parse(value.eventTime);
      if (isNaN(eventMs)) {
        throw new BadRequestException(
          `eventTime "${value.eventTime}" is not a valid ISO 8601 date string`,
        );
      }

      const nowMs = Date.now();
      const ageMs = nowMs - eventMs;

      if (ageMs > ValidateEventPipe.MAX_AGE_MS) {
        throw new BadRequestException(
          `eventTime is too old. Events must be within 7 days. ` +
            `Received: ${value.eventTime}`,
        );
      }

      if (eventMs - nowMs > ValidateEventPipe.MAX_FUTURE_MS) {
        throw new BadRequestException(
          `eventTime is more than 1 hour in the future. ` +
            `Received: ${value.eventTime}`,
        );
      }
    }

    this.logger.debug(
      `Event validated: ${value.eventName} ` +
        `[user=${value.userData?.userId ?? 'anon'}, session=${value.sessionId ?? 'none'}]`,
    );

    return value;
  }
}
