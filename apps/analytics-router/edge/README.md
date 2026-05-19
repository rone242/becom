# Analytics Edge — Cloudflare Workers V8 Isolate

> Edge gateway for the `analytics-router` microservice. Runs in Cloudflare's global V8 isolate network (300+ PoPs) to provide sub-millisecond event acceptance, rate limiting, geo-enrichment, and transparent origin forwarding.

## Architecture

```
Browser / Next.js
      │  POST /api/event
      ▼
┌─────────────────────────────────────────────────────┐
│  Cloudflare Worker (V8 Isolate)  — edge/src/index.ts│
│                                                     │
│  1. verifyApiKey()    — constant-time HMAC compare  │
│  2. checkRateLimit()  — KV sliding-window 60 req/min│
│  3. validateEvent()   — structural schema check     │
│  4. enrichWithGeo()   — inject cf.country/city/tz   │
│  5. fetch(ORIGIN_URL) — forward to NestJS origin    │
└─────────────────────────────────────────────────────┘
      │
      ▼
NestJS analytics-router :4001/api/event
  → BullMQ enqueue
  → Platform strategies (Facebook CAPI, GA4, TikTok CAPI)
```

All other paths (`/api/admin/*`, `/api/health`, `/docs`) are transparently proxied to the NestJS origin.

---

## Local Development

### Prerequisites
- Node.js ≥ 20
- A running NestJS analytics-router (port 4001)

### Setup

```bash
cd apps/analytics-router/edge

# Install deps
npm install

# Configure local secrets (copy and fill values)
cp .dev.vars.example .dev.vars   # or create manually — see below

# Start local Worker (miniflare — no Cloudflare account needed)
npm run dev
# Worker available at http://localhost:8787
```

### `.dev.vars` (create manually, git-ignored)
```ini
INTERNAL_API_KEY="change-me-to-a-secure-random-string"
ORIGIN_URL="http://localhost:4001"
```

### Test the edge Worker locally

```bash
# Valid event (should return 202)
curl -X POST http://localhost:8787/api/event \
  -H "Content-Type: application/json" \
  -H "x-internal-key: change-me-to-a-secure-random-string" \
  -d '{
    "eventName": "Purchase",
    "sessionId": "test-session-abc",
    "customData": { "value": 999, "currency": "BDT", "orderId": "ORD-001" }
  }'

# Missing API key (should return 401)
curl -X POST http://localhost:8787/api/event \
  -H "Content-Type: application/json" \
  -d '{"eventName":"PageView","sessionId":"s1"}'

# Invalid eventName (should return 400)
curl -X POST http://localhost:8787/api/event \
  -H "x-internal-key: change-me-to-a-secure-random-string" \
  -H "Content-Type: application/json" \
  -d '{"eventName":"InvalidEvent","sessionId":"s1"}'
```

---

## Production Deployment

### 1. Cloudflare account setup

You need:
- `CLOUDFLARE_API_TOKEN` (with Worker write permissions)
- `CLOUDFLARE_ACCOUNT_ID`

Set them as environment variables or use `wrangler login`.

### 2. Create the KV namespace for rate limiting

```bash
npx wrangler kv:namespace create "RATE_LIMIT_KV"
# → { id: "abc123...", preview_id: "def456..." }
```

Paste the IDs into `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "abc123..."
preview_id = "def456..."
```

### 3. Set production secrets

```bash
npx wrangler secret put INTERNAL_API_KEY
# paste your secure random key (same as NestJS INTERNAL_API_KEY)

npx wrangler secret put ORIGIN_URL
# paste your NestJS analytics-router public URL
# e.g. https://analytics.yourdomain.com
```

### 4. Configure routes

Uncomment and update the `routes` block in `wrangler.toml`:
```toml
routes = [
  { pattern = "analytics.yourdomain.com/api/event", zone_name = "yourdomain.com" }
]
```

### 5. Deploy

```bash
npm run deploy
# or from monorepo root:
npm run edge:deploy --workspace=apps/analytics-router
```

---

## Configuration Reference

| Variable | Set via | Description |
|---|---|---|
| `INTERNAL_API_KEY` | `wrangler secret` | Must match NestJS `INTERNAL_API_KEY` |
| `ORIGIN_URL` | `wrangler secret` | Public URL of the NestJS analytics-router |
| `RATE_LIMIT_MAX` | `wrangler.toml [vars]` | Max requests per IP per window (default: `60`) |
| `RATE_LIMIT_WINDOW` | `wrangler.toml [vars]` | Window size in seconds (default: `60`) |
| `RATE_LIMIT_KV` | `wrangler.toml [[kv_namespaces]]` | KV namespace for rate-limit counters |

---

## File Structure

```
edge/
├── src/
│   ├── index.ts       # Worker entry — fetch handler pipeline
│   ├── auth.ts        # Constant-time API key verification (HMAC-SHA256)
│   ├── rate-limit.ts  # KV sliding-window rate limiter
│   ├── validate.ts    # Structural event validation (no Node deps)
│   ├── geo.ts         # Cloudflare cf-object geo enrichment
│   └── respond.ts     # json() / error() response helpers
├── .dev.vars          # Local secrets (git-ignored)
├── .gitignore
├── package.json
├── tsconfig.json      # WebWorker lib, ES2022, no Node types
├── wrangler.toml      # Worker config, KV bindings, routes
└── README.md
```

---

## Security Notes

- **Constant-time key verification** — `auth.ts` uses HMAC-SHA256 via `crypto.subtle` to prevent timing-based key enumeration attacks.
- **Rate limiting** — KV-based sliding window. For hard enforcement, layer with Cloudflare's native Rate Limiting product.
- **No credentials at the edge** — the Worker never holds or forwards platform credentials (Pixel IDs, access tokens). Those stay in the NestJS origin + database.
- **CORS** — the Worker sets `Access-Control-Allow-Origin: *` for the event endpoint only, since the frontend SDK uses it from browser context. Admin routes keep the NestJS CORS policy.
