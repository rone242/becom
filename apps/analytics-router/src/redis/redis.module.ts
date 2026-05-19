import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * @Global — exposes the single IoRedis client to every module.
 * BullMQ uses a SEPARATE connection (configured in QueueModule) to
 * satisfy BullMQ's requirement for dedicated blocking connections.
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
