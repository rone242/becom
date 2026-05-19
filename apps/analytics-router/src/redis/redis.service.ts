import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * General-purpose Redis client for:
 *  - Integration config caching  (GET/SET/DEL with TTL)
 *  - User purchase counters       (INCR — the Redis-first optimization layer)
 *
 * NOTE: BullMQ uses its own separate IoRedis connections (configured via
 *       BullModule.forRootAsync) to avoid blocking the shared client.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private _isReady = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.warn('REDIS_URL not set — Redis features disabled.');
      return;
    }

    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      connectTimeout: 5_000,
      retryStrategy: (times) =>
        times > 5 ? null : Math.min(times * 300, 2_000),
    });

    this.client.on('ready', () => {
      this._isReady = true;
      this.logger.log('Redis connected and ready');
    });
    this.client.on('error', (err: Error) => {
      this._isReady = false;
      this.logger.warn(`Redis error: ${err.message}`);
    });
    this.client.on('end', () => { this._isReady = false; });

    try {
      await this.client.connect();
    } catch (err) {
      this.logger.warn(`Redis initial connect failed: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) await this.client.quit();
  }

  get isReady(): boolean {
    return this._isReady;
  }

  // ── Generic cache helpers ─────────────────────────────────────────────────

  async get<T>(key: string): Promise<T | null> {
    if (!this.isReady) return null;
    const raw = await this.client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.isReady) return;
    const payload = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, payload, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, payload);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isReady) return;
    await this.client.del(key);
  }

  // ── Atomic counter operations (Redis-first optimization) ─────────────────
  //
  // Using INCR instead of DB writes eliminates per-event PostgreSQL round-trips.
  // INCR is an O(1) atomic operation — safe under high concurrency without locks.

  /**
   * Atomically increment an integer counter and return the new value.
   * @param key  e.g. "user:purchase_count:clxyz123"
   */
  async incr(key: string): Promise<number> {
    if (!this.isReady) return 0;
    return this.client.incr(key);
  }

  /**
   * Atomically increment AND set a TTL atomically via pipeline.
   * Useful for capped counters that should expire (e.g., daily limits).
   */
  async incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
    if (!this.isReady) return 0;
    const pipeline = this.client.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, ttlSeconds);
    const results = await pipeline.exec();
    // results[0] = [err, newCount]
    return (results?.[0]?.[1] as number) ?? 0;
  }

  /**
   * Read the current integer value of a counter key.
   */
  async getCounter(key: string): Promise<number> {
    if (!this.isReady) return 0;
    const val = await this.client.get(key);
    return val ? parseInt(val, 10) : 0;
  }
}
