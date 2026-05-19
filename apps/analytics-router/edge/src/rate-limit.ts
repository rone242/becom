/**
 * KV-backed sliding-window rate limiter — optimized.
 *
 * Key change from v1:
 *   KV writes are scheduled via `ctx.waitUntil()` so they execute
 *   after the response is already sent to the client, eliminating
 *   any latency penalty from KV write latency (~5–20 ms globally).
 *
 * Algorithm: Fixed-window counter stored in Cloudflare KV.
 *   Key:   `rl:{ip}`
 *   Value: JSON { count: number, windowStart: number }
 *   TTL:   windowSec (auto-expiry prevents KV key accumulation)
 */

interface RateLimitState {
  count: number;
  windowStart: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp (seconds)
}

export async function checkRateLimit(
  kv: KVNamespace,
  ip: string,
  maxReqs: number,
  windowSec: number,
  ctx: ExecutionContext,
): Promise<RateLimitResult> {
  const key    = `rl:${ip}`;
  const nowSec = Math.floor(Date.now() / 1000);

  // Read current state
  const raw = await kv.get(key, 'text');
  let state: RateLimitState;

  if (raw) {
    state = JSON.parse(raw) as RateLimitState;
    // Expired window → start fresh
    if (nowSec - state.windowStart >= windowSec) {
      state = { count: 0, windowStart: nowSec };
    }
  } else {
    state = { count: 0, windowStart: nowSec };
  }

  const resetAt   = state.windowStart + windowSec;
  const remaining = Math.max(0, maxReqs - state.count - 1);

  if (state.count >= maxReqs) {
    return { allowed: false, remaining: 0, resetAt };
  }

  // Increment counter
  state.count += 1;
  const ttl = Math.max(1, windowSec - (nowSec - state.windowStart));

  // ── Non-blocking write via waitUntil ──────────────────────────────────────
  // The KV put happens *after* the Response is returned to the client,
  // so it adds zero latency to the critical path.
  ctx.waitUntil(
    kv.put(key, JSON.stringify(state), { expirationTtl: ttl }).catch(() => {
      console.warn(`[edge/rate-limit] KV write failed for key ${key}`);
    }),
  );

  return { allowed: true, remaining, resetAt };
}
