# ─────────────────────────────────────────────
# Stage 1 — Builder
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

# Copy workspace manifests
COPY package.json package-lock.json turbo.json ./
COPY apps/analytics-router/package.json ./apps/analytics-router/
COPY packages/database/package.json ./packages/database/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# Build analytics router
RUN npm run build --workspace=apps/analytics-router


# ─────────────────────────────────────────────
# Stage 2 — Runner
# ─────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl

# Create non-root user
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

# Copy root workspace files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy the shared database package
COPY --from=builder /app/packages/database ./packages/database

# Copy the analytics-router workspace files
COPY --from=builder /app/apps/analytics-router/package.json ./apps/analytics-router/
COPY --from=builder /app/apps/analytics-router/node_modules ./apps/analytics-router/node_modules
COPY --from=builder /app/apps/analytics-router/dist ./apps/analytics-router/dist
COPY --from=builder /app/apps/analytics-router/.env.example ./apps/analytics-router/

USER nestjs

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-5001}/api/health || exit 1

# Change working directory to the app workspace before running
WORKDIR /app/apps/analytics-router
CMD ["node", "dist/main.js"]
