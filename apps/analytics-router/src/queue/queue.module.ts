import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventProcessor } from './event.processor';
import { EVENT_QUEUE_NAME } from './event.queue';
import { IntegrationModule } from '../integration/integration.module';
import { EventModule } from '../event/event.module';
import { CounterModule } from '../counter/counter.module';
import { StrategiesModule } from '../strategies/strategies.module';

@Module({
  imports: [
    /**
     * BullMQ root configuration — registers the Redis connection used
     * exclusively by BullMQ workers (separate from the general RedisService
     * client to avoid blocking on BRPOP commands).
     */
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL') ?? '';
        const isTls = redisUrl.startsWith('rediss://');
        return {
          connection: {
            url: redisUrl,
            maxRetriesPerRequest: null, // Required by BullMQ for blocking commands
            enableReadyCheck: false,
            ...(isTls && { tls: { rejectUnauthorized: false } }),
          },
          defaultJobOptions: {
            removeOnComplete: { count: 500 },
            removeOnFail: { count: 200 },
          },
        };
      },
      inject: [ConfigService],
    }),

    // Re-register the queue so the processor can consume it
    BullModule.registerQueue({ name: EVENT_QUEUE_NAME }),

    // Domain modules needed by EventProcessor
    IntegrationModule,
    EventModule,
    CounterModule,
    StrategiesModule,
  ],
  providers: [EventProcessor],
})
export class QueueModule {}
