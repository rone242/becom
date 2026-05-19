import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { EVENT_QUEUE_NAME } from '../queue/event.queue';

@Module({
  imports: [
    // Register the queue producer here. QueueModule registers the processor.
    BullModule.registerQueue({ name: EVENT_QUEUE_NAME }),
  ],
  controllers: [EventController],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
