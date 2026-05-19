import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/api-key.guard';
import { ValidateEventPipe } from '../common/pipes/validate-event.pipe';
import { EventService } from './event.service';
import { TrackEventDto } from './dto/track-event.dto';

/**
 * Client-facing event endpoint.
 *
 * This is the ONLY endpoint the Next.js frontend calls.
 * It must return 202 Accepted immediately — no platform calls happen here.
 *
 * Throughput target: > 1,000 req/s on a single Node.js instance.
 * The bottleneck is the Redis RPUSH (BullMQ enqueue), not this controller.
 */
@ApiTags('Event Ingestion')
@ApiSecurity('InternalKey')
@Controller('event')
export class EventController {
  constructor(private readonly service: EventService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED) // 202 — event received, processing async
  @UseGuards(ApiKeyGuard)
  @ApiOperation({
    summary: 'Track an analytics event (fire-and-forget)',
    description:
      'Immediately returns 202. The event is logged and queued for async ' +
      'dispatch to all active third-party platforms (Facebook CAPI, GA4, TikTok).',
  })
  @ApiResponse({
    status: 202,
    description: 'Event accepted for async processing',
    schema: {
      example: {
        status: 'accepted',
        trackingId: 'c8e9f2a1-4b3d-...',
        message: 'Event queued for dispatch',
      },
    },
  })
  @UsePipes(ValidateEventPipe)
  async track(@Body() dto: TrackEventDto) {
    const { trackingId } = await this.service.ingest(dto);

    return {
      status: 'accepted',
      trackingId,
      message: 'Event queued for dispatch',
    };
  }
}
