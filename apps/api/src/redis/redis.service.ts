import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private ready = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.config.get<string>('REDIS_URL');

    if (!redisUrl) {
      this.logger.warn('REDIS_URL is not set. Redis cache is disabled.');
      return;
    }

    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      retryStrategy: (times) => (times > 5 ? null : Math.min(times * 200, 1000)),
    });

    this.client.on('ready', () => {
      this.ready = true;
      this.logger.log('Redis connection ready');
    });

    this.client.on('end', () => {
      this.ready = false;
    });

    this.client.on('error', (error) => {
      this.ready = false;
      this.logger.warn(`Redis error: ${error.message}`);
    });

    try {
      await this.client.connect();
    } catch (error) {
      this.ready = false;
      this.logger.warn(`Redis connection failed: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  isReady() {
    return this.ready && Boolean(this.client);
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isReady()) return null;

    const value = await this.client.get(key);
    if (!value) return null;

    return JSON.parse(value) as T;
  }

  async set(key: string, value: unknown, ttlSeconds?: number) {
    if (!this.isReady()) return;

    const payload = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, payload, 'EX', ttlSeconds);
      return;
    }

    await this.client.set(key, payload);
  }

  async del(key: string) {
    if (!this.isReady()) return;
    await this.client.del(key);
  }

  async delByPattern(pattern: string) {
    if (!this.isReady()) return;

    const stream = this.client.scanStream({ match: pattern, count: 100 });

    for await (const keys of stream) {
      const matchedKeys = keys as string[];
      if (matchedKeys.length > 0) {
        await this.client.del(...matchedKeys);
      }
    }
  }
}
