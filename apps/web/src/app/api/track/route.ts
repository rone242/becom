/**
 * /api/track — Next.js server-side proxy for analytics events.
 *
 * The browser-side tracker.ts POSTs here using plain fetch (no Axios/interceptors).
 * This handler enriches the payload with server-side context (IP, User-Agent)
 * and forwards it to the analytics-router via Docker internal networking.
 *
 * URL resolution:
 *   Docker (production/staging):  SERVER_ANALYTICS_ROUTER_URL = http://becom-analytics-router:5001/api
 *   Local dev:                    http://localhost:4001/api
 */
import { NextResponse } from 'next/server';

const ANALYTICS_URL = (
  process.env.SERVER_ANALYTICS_ROUTER_URL ||
  process.env.NEXT_PUBLIC_ANALYTICS_ROUTER_URL ||
  'http://localhost:4001/api'
).replace(/\/$/, '');

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

export async function POST(req: Request) {
  // ── Guard: key must be configured ──────────────────────────────────────────
  if (!INTERNAL_API_KEY) {
    console.error('[API/Track] ❌ INTERNAL_API_KEY is not set in environment.');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // ── Parse request body ──────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Require at minimum an eventName
  if (!body.eventName) {
    return NextResponse.json({ error: 'eventName is required' }, { status: 400 });
  }

  // ── Server-side enrichment ──────────────────────────────────────────────────
  const forwardedFor = req.headers.get('x-forwarded-for');
  const clientIp     = forwardedFor ? forwardedFor.split(',')[0].trim() : undefined;
  const userAgent    = req.headers.get('user-agent') || undefined;

  // Build the full TrackEventDto payload expected by analytics-router
  const payload = {
    ...body,
    // Auto-stamp eventTime so ValidateEventPipe never rejects a missing timestamp
    eventTime: (body.eventTime as string) ?? new Date().toISOString(),
    ...(clientIp  && { clientIp }),
    ...(userAgent && { userAgent }),
  };

  // ── Forward to analytics-router ─────────────────────────────────────────────
  const url = `${ANALYTICS_URL}/event`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type':   'application/json',
        // JwtAdminGuard (dual-mode) accepts x-internal-key for internal callers
        'x-internal-key': INTERNAL_API_KEY,
        ...(clientIp  && { 'X-Forwarded-For': clientIp }),
        ...(userAgent && { 'User-Agent': userAgent }),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // Log the exact error from the analytics-router for debugging
      const errorBody = await response.text().catch(() => '(no body)');
      console.error(
        `[API/Track] ❌ analytics-router responded ${response.status} ${response.statusText}`,
        { url, payload, errorBody },
      );
      return NextResponse.json(
        { error: 'Analytics router rejected the event', detail: errorBody },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 202 });

  } catch (err: unknown) {
    // Network / connection error — analytics-router may be down
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[API/Track] ❌ Failed to reach analytics-router at ${url}:`,
      message,
    );
    return NextResponse.json(
      { error: 'Could not reach analytics service', detail: message },
      { status: 502 },
    );
  }
}
