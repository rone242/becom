FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/analytics-router/package.json ./apps/analytics-router/
COPY apps/analytics-router/edge/package.json ./apps/analytics-router/edge/
COPY packages/database/package.json ./packages/database/

RUN npm ci

COPY . .

# NEXT_PUBLIC_* vars must be declared as build ARGs — Next.js bakes them
# into the static bundle at build time (they are NOT available at runtime)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ANALYTICS_ROUTER_URL
ARG NEXT_PUBLIC_WHATSAPP_NUMBER
ARG NEXT_PUBLIC_GTM_ID

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_ANALYTICS_ROUTER_URL=$NEXT_PUBLIC_ANALYTICS_ROUTER_URL
ENV NEXT_PUBLIC_WHATSAPP_NUMBER=$NEXT_PUBLIC_WHATSAPP_NUMBER
ENV NEXT_PUBLIC_GTM_ID=$NEXT_PUBLIC_GTM_ID

RUN npm run build --workspace=apps/web

# ─────────────────────────────────────────────
# Stage 2 — Runner (minimal standalone image)
# ─────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nodejs \
  && adduser -S nextjs -G nodejs

# standalone output is a self-contained server — no need to copy node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

# standalone server entry point lives at apps/web/server.js
WORKDIR /app/apps/web
CMD ["node", "server.js"]
