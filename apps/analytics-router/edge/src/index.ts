/**
 * Cloudflare Worker — Becom Analytics Edge Layer  (Optimized)
 *
 * Architecture:
 *   Browser / Next.js
 *     → [this Worker]  POST /api/event
 *         1. CORS OPTIONS pre-flight
 *         2. Verify X-Internal-Key (constant-time HMAC compare)
 *         3. Rate-limit per IP via KV sliding window
 *         4. Parse body + structural validation (no external deps)
 *         5. Geo-enrich payload from Cloudflare cf object
 *         6. Forward to NestJS origin (non-blocking via waitUntil)
 *     → NestJS :4001/api/event → BullMQ → CAPI dispatch
 *
 * All non-event paths are transparently proxied to the origin.
 *
 * Optimisations vs v1:
 *  - ctx.waitUntil() for KV writes → zero latency impact on response
 *  - Request ID injected for end-to-end tracing
 *  - Structured JSON error shape (consistent with NestJS HttpException)
 *  - OPTIONS handled at the top of the pipeline (no auth overhead)
 *  - Origin response streamed instead of buffered (lower TTFB)
 *  - Accept-Encoding forwarded so origin can gzip
 *  - Cache-Control: no-store on all analytics responses
 */

import { verifyApiKey }   from './auth';
import { checkRateLimit } from './rate-limit';
import { validateEvent }  from './validate';
import { enrichWithGeo }  from './geo';
import { json, error }    from './respond';

export interface Env {
  /** KV namespace for rate-limit counters — bind in wrangler.toml */
  RATE_LIMIT_KV: KVNamespace;
  /** Pre-shared key — must match INTERNAL_API_KEY in analytics-router .env */
  INTERNAL_API_KEY: string;
  /** Public URL of the NestJS analytics-router, e.g. https://api.yourdomain.com */
  ORIGIN_URL: string;
  /** Max requests per IP per window (default: 60) */
  RATE_LIMIT_MAX?: string;
  /** Sliding window size in seconds (default: 60) */
  RATE_LIMIT_WINDOW?: string;
  /** Allowed CORS origin — set to your frontend domain in production */
  CORS_ORIGIN?: string;
}

const EVENT_PATH = '/api/event';

// ─── CORS Headers ─────────────────────────────────────────────────────────────
function corsHeaders(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin':  env.CORS_ORIGIN ?? '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-internal-key, x-request-id',
    'Access-Control-Max-Age':       '86400',
    'Cache-Control':                'no-store',
    'Vary':                         'Origin',
  };
}

// ─── Unique request ID ────────────────────────────────────────────────────────
function requestId(): string {
  return crypto.randomUUID();
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const rid = request.headers.get('x-request-id') ?? requestId();

    // ── CORS pre-flight — fastest possible exit, no auth overhead ────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    // ── Pass-through: proxy everything except POST /api/event ───────────────
    if (url.pathname !== EVENT_PATH || request.method !== 'POST') {
      return proxyToOrigin(request, env);
    }

    // ── Guard: required env vars ─────────────────────────────────────────────
    if (!env.INTERNAL_API_KEY || !env.ORIGIN_URL) {
      console.error('[edge] Missing required env vars: INTERNAL_API_KEY or ORIGIN_URL');
      return error('Edge misconfiguration — contact the site administrator', 503, rid);
    }

    // ── Step 1: API Key ──────────────────────────────────────────────────────
    const keyOk = await verifyApiKey(request, env.INTERNAL_API_KEY);
    if (!keyOk) {
      return error('Missing or invalid x-internal-key header', 401, rid);
    }

    // ── Step 2: Rate limiting ────────────────────────────────────────────────
    const clientIp  = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const maxReqs   = parseInt(env.RATE_LIMIT_MAX    ?? '60', 10);
    const windowSec = parseInt(env.RATE_LIMIT_WINDOW ?? '60', 10);

    const rateResult = await checkRateLimit(env.RATE_LIMIT_KV, clientIp, maxReqs, windowSec, ctx);

    const rateLimitHeaders: Record<string, string> = {
      'X-RateLimit-Limit':     String(maxReqs),
      'X-RateLimit-Remaining': String(rateResult.remaining),
      'X-RateLimit-Reset':     String(rateResult.resetAt),
    };

    if (!rateResult.allowed) {
      return new Response(
        JSON.stringify({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please slow down.',
          resetAt: rateResult.resetAt,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After':  String(rateResult.resetAt - Math.floor(Date.now() / 1000)),
            ...rateLimitHeaders,
            ...corsHeaders(env),
          },
        },
      );
    }

    // ── Step 3: Parse & validate body ────────────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return error('Request body must be valid JSON', 400, rid);
    }

    const validation = validateEvent(body);
    if (!validation.ok) {
      return error(validation.error, 400, rid);
    }

    // ── Step 4: Geo-enrich ───────────────────────────────────────────────────
    const cf      = request.cf as CfProperties | undefined;
    const enriched = enrichWithGeo(validation.payload, cf, clientIp);

    // ── Step 5: Forward to NestJS origin ─────────────────────────────────────
    const originUrl = `${env.ORIGIN_URL.replace(/\/$/, '')}${EVENT_PATH}`;
    const originReq = new Request(originUrl, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'Accept-Encoding': request.headers.get('Accept-Encoding') ?? 'gzip',
        'x-internal-key':  env.INTERNAL_API_KEY,
        'x-request-id':   rid,
        'x-edge-worker':   '1',
        'X-Forwarded-For': clientIp,
        'User-Agent':      request.headers.get('User-Agent') ?? '',
      },
      body: JSON.stringify(enriched),
    });

    try {
      const originRes = await fetch(originReq);

      // Stream the origin response body directly — avoids buffering in V8
      return new Response(originRes.body, {
        status: originRes.status,
        headers: {
          'Content-Type':  originRes.headers.get('Content-Type') ?? 'application/json',
          'x-request-id': rid,
          ...rateLimitHeaders,
          ...corsHeaders(env),
        },
      });
    } catch (err) {
      console.error(`[edge] Origin fetch failed (rid=${rid}):`, err);
      return error('Analytics service temporarily unavailable', 502, rid);
    }
  },
} satisfies ExportedHandler<Env>;

// ── Transparent proxy to origin for all non-event paths ──────────────────────
function proxyToOrigin(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (!env.ORIGIN_URL) return Promise.resolve(error('ORIGIN_URL not configured', 503));

  const originUrl = `${env.ORIGIN_URL.replace(/\/$/, '')}${url.pathname}${url.search}`;

  // Clone the request but target the origin
  const proxied = new Request(originUrl, {
    method:   request.method,
    headers:  request.headers,
    body:     request.body,
    redirect: 'follow',
  });

  return fetch(proxied);
}
