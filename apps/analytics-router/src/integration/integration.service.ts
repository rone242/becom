import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnalyticsPlatform, IntegrationSetting, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  CreateIntegrationDto,
  UpdateIntegrationDto,
} from './dto/update-integration.dto';

/**
 * Redis key schema for integration configs:
 *
 *   integration:config:FACEBOOK_CAPI        → { isActive, credentials, ... }
 *   integration:config:GOOGLE_ANALYTICS_4   → { ... }
 *   integration:config:TIKTOK_CAPI          → { ... }
 *
 * TTL: INTEGRATION_CACHE_TTL (default 3600s = 1 hour).
 *
 * Cache invalidation strategy: on every PUT/PATCH, the corresponding key
 * is deleted from Redis. The next queue job triggers a DB read and
 * re-populates the cache (lazy cache-miss pattern).
 */
@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);
  private readonly cacheTtl: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    config: ConfigService,
  ) {
    this.cacheTtl = parseInt(
      config.get<string>('INTEGRATION_CACHE_TTL') ?? '3600',
      10,
    );
  }

  // ── Cache Key Helpers ────────────────────────────────────────────────────

  private cacheKey(platform: AnalyticsPlatform): string {
    return `integration:config:${platform}`;
  }

  // ── Read (Redis L1 → Prisma L2) ─────────────────────────────────────────

  /**
   * Get all integration settings. Admin view — returns raw DB rows.
   * Does NOT use cache so the admin always sees the authoritative state.
   */
  async findAll(): Promise<IntegrationSetting[]> {
    return this.prisma.integrationSetting.findMany({
      orderBy: { platform: 'asc' },
    });
  }

  /**
   * Get a single integration by platform — used by the queue processor.
   *
   * Cache-aside pattern:
   *   1. Check Redis → hit → return immediately (no DB round-trip)
   *   2. Cache miss → read from Prisma → write to Redis → return
   */
  async findByPlatform(
    platform: AnalyticsPlatform,
  ): Promise<IntegrationSetting | null> {
    const key = this.cacheKey(platform);

    // L1: Redis cache
    const cached = await this.redis.get<IntegrationSetting>(key);
    if (cached) {
      this.logger.debug(`Cache HIT for ${key}`);
      return cached;
    }

    // L2: Prisma (Neon DB)
    this.logger.debug(`Cache MISS for ${key} — fetching from DB`);
    const setting = await this.prisma.integrationSetting.findUnique({
      where: { platform },
    });

    if (setting) {
      // Write-through: populate cache for next consumer
      await this.redis.set(key, setting, this.cacheTtl);
    }

    return setting;
  }

  // ── Write (Prisma + Cache Invalidation) ─────────────────────────────────

  /**
   * Upsert an integration setting.
   * After DB write, the cache key is deleted to force a fresh load on next access.
   */
  async upsert(
    platform: AnalyticsPlatform,
    dto: CreateIntegrationDto | UpdateIntegrationDto,
  ): Promise<IntegrationSetting> {
    const setting = await this.prisma.integrationSetting.upsert({
      where: { platform },
      update: {
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.credentials !== undefined && {
          credentials: dto.credentials as unknown as Prisma.InputJsonValue,
        }),
      },
      create: {
        platform,
        isActive: (dto as CreateIntegrationDto).isActive ?? false,
        credentials: ((dto as CreateIntegrationDto).credentials ?? {}) as unknown as Prisma.InputJsonValue,
      },
    });

    // ⚡ Cache invalidation — next read will re-populate from DB
    await this.invalidateCache(platform);
    this.logger.log(`Integration updated and cache invalidated: ${platform}`);

    return setting;
  }

  /**
   * Toggle active state without touching credentials.
   */
  async toggleActive(
    platform: AnalyticsPlatform,
    isActive: boolean,
  ): Promise<IntegrationSetting> {
    const existing = await this.prisma.integrationSetting.findUnique({
      where: { platform },
    });
    if (!existing) {
      throw new NotFoundException(`Integration ${platform} not found`);
    }

    const updated = await this.prisma.integrationSetting.update({
      where: { platform },
      data: { isActive },
    });

    await this.invalidateCache(platform);
    return updated;
  }

  /**
   * Delete a Redis cache entry for a specific platform.
   * Called explicitly after any write operation.
   */
  async invalidateCache(platform: AnalyticsPlatform): Promise<void> {
    await this.redis.del(this.cacheKey(platform));
    this.logger.debug(`Cache invalidated: ${this.cacheKey(platform)}`);
  }

  /**
   * Invalidate all platform cache keys at once (e.g., after a bulk reset).
   */
  async invalidateAllCaches(): Promise<void> {
    const platforms = Object.values(AnalyticsPlatform);
    await Promise.all(platforms.map((p) => this.invalidateCache(p)));
    this.logger.log('All integration caches invalidated');
  }
}
