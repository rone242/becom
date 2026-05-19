/**
 * Structural event validation at the edge.
 *
 * No class-validator / reflect-metadata — must use pure ES2022 compatible
 * with the V8 Workers runtime.
 *
 * Rules mirrored from apps/analytics-router/src/common/pipes/validate-event.pipe.ts:
 *  1. eventName must be one of the 8 supported platform events
 *  2. Either sessionId OR userData.userId must be present
 *  3. Purchase events must include customData.value > 0 and currency
 *  4. eventTime (if present) must be a valid ISO 8601 string within 7 days
 *
 * The NestJS origin will re-validate with class-validator decorators —
 * this edge pass is a fast, lightweight first filter only.
 */

/** Mirrors EventName enum in track-event.dto.ts */
const ALLOWED_EVENT_NAMES = new Set([
  'Purchase',
  'ViewContent',
  'AddToCart',
  'InitiateCheckout',
  'Search',
  'CompleteRegistration',
  'Lead',
  'PageView',
]);

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;   // 7 days
const MAX_FUTURE_MS = 60 * 60 * 1_000;           // 1 hour

export interface ValidPayload {
  eventName: string;
  sessionId?: string;
  userData?: { userId?: string; email?: string; phone?: string; country?: string; dateOfBirth?: string };
  customData?: { value?: number; currency?: string; contentId?: string; contentType?: string; numItems?: number; orderId?: string };
  eventTime?: string;
  clientIp?: string;
  userAgent?: string;
  pageUrl?: string;
}

type ValidationResult =
  | { ok: true; payload: ValidPayload }
  | { ok: false; error: string };

export function validateEvent(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }

  const b = body as Record<string, unknown>;

  // ── Rule 1: eventName ────────────────────────────────────────────────────
  if (typeof b['eventName'] !== 'string') {
    return { ok: false, error: 'eventName is required and must be a string' };
  }
  if (!ALLOWED_EVENT_NAMES.has(b['eventName'])) {
    return {
      ok: false,
      error: `eventName "${b['eventName']}" is not supported. Allowed: ${[...ALLOWED_EVENT_NAMES].join(', ')}`,
    };
  }

  // ── Rule 2: at least one user identifier ────────────────────────────────
  const userData = b['userData'] as Record<string, unknown> | undefined;
  const hasUserId = typeof userData?.['userId'] === 'string' && userData['userId'].length > 0;
  const hasSession = typeof b['sessionId'] === 'string' && (b['sessionId'] as string).length > 0;

  if (!hasUserId && !hasSession) {
    return {
      ok: false,
      error: 'Either userData.userId or sessionId must be provided for attribution',
    };
  }

  // ── Rule 3: Purchase requires value > 0 and currency ────────────────────
  if (b['eventName'] === 'Purchase') {
    const cd = b['customData'] as Record<string, unknown> | undefined;
    const value = cd?.['value'];
    if (typeof value !== 'number' || value <= 0) {
      return { ok: false, error: 'Purchase events must include customData.value > 0' };
    }
    if (typeof cd?.['currency'] !== 'string' || (cd['currency'] as string).length === 0) {
      return { ok: false, error: 'Purchase events must include customData.currency (e.g. "BDT")' };
    }
  }

  // ── Rule 4: eventTime window ─────────────────────────────────────────────
  if (b['eventTime'] !== undefined) {
    if (typeof b['eventTime'] !== 'string') {
      return { ok: false, error: 'eventTime must be a string' };
    }
    const eventMs = Date.parse(b['eventTime']);
    if (isNaN(eventMs)) {
      return { ok: false, error: `eventTime "${b['eventTime']}" is not a valid ISO 8601 date` };
    }
    const nowMs = Date.now();
    if (nowMs - eventMs > MAX_AGE_MS) {
      return { ok: false, error: 'eventTime is too old — must be within 7 days' };
    }
    if (eventMs - nowMs > MAX_FUTURE_MS) {
      return { ok: false, error: 'eventTime is more than 1 hour in the future' };
    }
  }

  return { ok: true, payload: b as unknown as ValidPayload };
}
