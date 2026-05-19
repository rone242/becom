import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AnalyticsPlatform } from '@prisma/client';
import { JwtAdminGuard } from '../common/jwt-admin.guard';
import { IntegrationService } from './integration.service';
import { UpdateIntegrationDto } from './dto/update-integration.dto';

/**
 * Admin-only controller for managing third-party platform integrations.
 *
 * All routes require a valid admin JWT (Authorization: Bearer <token>).
 * Updates automatically invalidate the corresponding Redis cache key,
 * ensuring the queue processor picks up fresh credentials on its next run.
 */
@ApiTags('Admin — Integrations')
@ApiBearerAuth()
@UseGuards(JwtAdminGuard)
@Controller('admin/integrations')
export class IntegrationController {
  constructor(private readonly service: IntegrationService) {}

  @Get()
  @ApiOperation({ summary: 'List all integration settings (DB authoritative view)' })
  @ApiResponse({ status: 200, description: 'Array of IntegrationSetting records' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':platform')
  @ApiOperation({ summary: 'Get a single integration setting by platform' })
  @ApiParam({ name: 'platform', enum: AnalyticsPlatform })
  findOne(@Param('platform') platform: AnalyticsPlatform) {
    return this.service.findByPlatform(platform);
  }

  @Put(':platform')
  @ApiOperation({
    summary: 'Upsert integration credentials and/or isActive flag',
    description:
      'Creates the record if it does not exist. After saving to Neon DB, the ' +
      'Redis cache key (integration:config:{platform}) is deleted — next job ' +
      'will re-populate from DB automatically.',
  })
  @ApiParam({ name: 'platform', enum: AnalyticsPlatform })
  upsert(
    @Param('platform') platform: AnalyticsPlatform,
    @Body() dto: UpdateIntegrationDto,
  ) {
    return this.service.upsert(platform, dto);
  }

  @Delete('cache/:platform')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Manually bust Redis cache for a specific platform',
    description:
      'Useful if you directly edited the DB record and want to force ' +
      'the next job to re-read from Neon DB.',
  })
  @ApiParam({ name: 'platform', enum: AnalyticsPlatform })
  async bustCache(@Param('platform') platform: AnalyticsPlatform) {
    await this.service.invalidateCache(platform);
  }

  @Delete('cache')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Bust ALL integration caches at once' })
  async bustAllCaches() {
    await this.service.invalidateAllCaches();
  }
}
