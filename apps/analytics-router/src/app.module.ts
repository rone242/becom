import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { IntegrationModule } from './integration/integration.module';
import { EventModule } from './event/event.module';
import { QueueModule } from './queue/queue.module';
import { StrategiesModule } from './strategies/strategies.module';
import { CounterModule } from './counter/counter.module';
import { StatsModule } from './stats/stats.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Infrastructure
    PrismaModule,
    RedisModule,

    // Domain modules
    IntegrationModule,   // Admin CRUD for platform credentials + cache invalidation
    EventModule,         // POST /api/event → 202 fire-and-forget, Redis TTL storage
    QueueModule,         // BullMQ + EventProcessor worker
    StrategiesModule,    // Facebook CAPI, GA4, TikTok CAPI strategies
    CounterModule,       // Redis purchase counters → VIP milestone
    StatsModule,         // GET /api/admin/stats — daily sent/failed counts
  ],
  controllers: [HealthController],
})
export class AppModule {}
