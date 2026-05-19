import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomerTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

/**
 * CounterService — Redis-First Event Counter with VIP Milestone Logic
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                    REDIS-FIRST OPTIMIZATION                         │
 * │                                                                     │
 * │  Problem: Incrementing a counter per purchase in PostgreSQL causes  │
 * │  one UPDATE + one SELECT per event. At scale this burns Neon DB     │
 * │  Compute Units and creates write contention.                        │
 * │                                                                     │
 * │  Solution:                                                          │
 * │    Redis INCR("user:purchase_count:{userId}")                       │
 * │    → Atomic, O(1), in-memory → no DB round-trip                    │
 * │    → Only write to Neon DB when count hits a milestone (e.g. 10)   │
 * │                                                                     │
 * │  Result: 10x fewer PostgreSQL writes at the cost of ~8 bytes per   │
 * │  user in Redis. Perfectly suited for serverless DB pricing models.  │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Redis Key Schema:
 *   user:purchase_count:{userId}  →  Integer (unbounded)
 *   user:tier:{userId}            →  String  ("REGULAR" | "VIP" | "PLATINUM")
 */
@Injectable()
export class CounterService {
  private readonly logger = new Logger(CounterService.name);
  private readonly vipMilestone: number;

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.vipMilestone = parseInt(
      config.get<string>('VIP_PURCHASE_MILESTONE') ?? '10',
      10,
    );
  }

  // ── Key builders ─────────────────────────────────────────────────────────

  private purchaseCountKey(userId: string): string {
    return `user:purchase_count:${userId}`;
  }

  private tierCacheKey(userId: string): string {
    return `user:tier:${userId}`;
  }

  // ── Main entry point called by EventProcessor ─────────────────────────────

  /**
   * Called by EventProcessor after a successful 'Purchase' event dispatch.
   *
   * Steps:
   *   1. Atomically INCR the purchase counter in Redis
   *   2. Check if count hits a milestone (count % vipMilestone === 0)
   *   3. If milestone → read current tier from Redis (or Prisma)
   *   4. If current tier is REGULAR → upgrade to VIP in Prisma + update Redis tier cache
   *
   * @param userId  The authenticated user's ID (from event userData)
   */
  async onPurchaseSuccess(userId: string): Promise<void> {
    const countKey = this.purchaseCountKey(userId);

    // ── Step 1: Atomic increment (no DB write) ────────────────────────────
    const newCount = await this.redis.incr(countKey);
    this.logger.debug(
      `User ${userId} purchase count: ${newCount} (key: ${countKey})`,
    );

    // ── Step 2: Check milestone ───────────────────────────────────────────
    if (newCount % this.vipMilestone !== 0) {
      return; // Not a milestone — done, zero DB cost
    }

    this.logger.log(
      `Milestone hit! User ${userId} reached ${newCount} purchases.`,
    );

    // ── Step 3: Get current tier (Redis cache → Prisma fallback) ─────────
    const currentTier = await this.getCurrentTier(userId);

    // ── Step 4: Upgrade if still REGULAR ─────────────────────────────────
    // This prevents repeat upgrades if the user is already VIP or PLATINUM
    if (currentTier === CustomerTier.REGULAR) {
      await this.upgradeTier(userId, CustomerTier.VIP);
    } else if (currentTier === CustomerTier.VIP && newCount >= this.vipMilestone * 5) {
      // Example: PLATINUM at 50 purchases (5x VIP milestone)
      await this.upgradeTier(userId, CustomerTier.PLATINUM);
    }
  }

  /**
   * Get current tier — Redis cache first, Prisma fallback.
   * Caches the result for 24 hours to avoid repeated DB reads for non-milestone events.
   */
  private async getCurrentTier(userId: string): Promise<CustomerTier> {
    const key = this.tierCacheKey(userId);
    const cached = await this.redis.get<CustomerTier>(key);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });

    const tier = user?.tier ?? CustomerTier.REGULAR;
    // Cache for 24 hours — tier changes are infrequent
    await this.redis.set(key, tier, 86_400);
    return tier;
  }

  /**
   * Write tier upgrade to Neon DB and invalidate tier cache.
   * This is the ONLY Prisma write triggered by the counter logic.
   */
  private async upgradeTier(
    userId: string,
    newTier: CustomerTier,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { tier: newTier },
    });

    // Invalidate tier cache so next read reflects the new tier
    await this.redis.del(this.tierCacheKey(userId));

    this.logger.log(`🏆 User ${userId} upgraded to tier: ${newTier}`);
  }

  // ── Admin / debugging helpers ─────────────────────────────────────────────

  /**
   * Read the current purchase count directly from Redis (no DB).
   */
  async getPurchaseCount(userId: string): Promise<number> {
    return this.redis.getCounter(this.purchaseCountKey(userId));
  }

  /**
   * Reset the Redis counter for a user (e.g., after manual tier assignment).
   * Does NOT change the DB tier — admin must update tier separately.
   */
  async resetCounter(userId: string): Promise<void> {
    await this.redis.del(this.purchaseCountKey(userId));
    await this.redis.del(this.tierCacheKey(userId));
    this.logger.warn(`Counter and tier cache reset for user: ${userId}`);
  }
}
