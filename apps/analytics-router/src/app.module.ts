import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { IntegrationModule } from './integration/integration.module';
import { EventModule } from './event/event.module';
import { QueueModule } from './queue/queue.module';
import { StrategiesModule } from './strategies/strategies.module';
import { CounterModule } from './counter/counter.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Load .env file — isGlobal makes ConfigService available everywhere
    ConfigModule.forRoot({ isGlobal: true }),

    // Infrastructure (both are @Global so no re-importing needed downstream)
    PrismaModule,
    RedisModule,

    // Domain modules
    IntegrationModule,   // Admin CRUD for platform credentials + cache invalidation
    EventModule,         // POST /api/event  → 202 fire-and-forget
    QueueModule,         // BullMQ registration + EventProcessor worker
    StrategiesModule,    // Facebook, GA4, TikTok strategy implementations
    CounterModule,       // Redis INCR counters + VIP milestone Prisma writes
  ],
  controllers: [HealthController],
})
export class AppModule {}
