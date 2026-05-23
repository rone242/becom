import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { EVENT_QUEUE_NAME } from '../queue/event.queue';
import { StatsModule } from '../stats/stats.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: EVENT_QUEUE_NAME }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
    StatsModule, // provides StatsService for received-event counting
  ],
  controllers: [EventController],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}

