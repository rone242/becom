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
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAdminGuard } from '../common/jwt-admin.guard';
import { ValidateEventPipe } from '../common/pipes/validate-event.pipe';
import { EventService } from './event.service';
import { TrackEventDto } from './dto/track-event.dto';

/**
 * Client-facing event endpoint.
 * Protected by JWT (same secret as the main API).
 * Returns 202 Accepted immediately — all platform dispatch is async.
 */
@ApiTags('Event Ingestion')
@ApiBearerAuth()
@Controller('event')
export class EventController {
  constructor(private readonly service: EventService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(JwtAdminGuard)
  @ApiOperation({
    summary: 'Track an analytics event (fire-and-forget)',
    description:
      'Stores event in Redis for 10 minutes, queues async dispatch to all active platforms.',
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
