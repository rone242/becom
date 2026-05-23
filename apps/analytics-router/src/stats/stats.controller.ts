import {
  Controller, Get, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { JwtAdminGuard } from '../common/jwt-admin.guard';

@ApiTags('Analytics Stats')
@ApiBearerAuth()
@UseGuards(JwtAdminGuard)
@Controller('admin/stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  /**
   * GET /api/admin/stats?from=2026-05-01&to=2026-05-22
   * Returns daily sent/failed counts per platform for the given date range.
   * Admin JWT required.
   */
  @Get()
  @ApiOperation({ summary: 'Get analytics event stats (admin only)' })
  @ApiQuery({ name: 'from', example: '2026-05-01', description: 'Start date YYYY-MM-DD' })
  @ApiQuery({ name: 'to', example: '2026-05-22', description: 'End date YYYY-MM-DD' })
  async getStats(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    // Default: last 7 days if no range provided
    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
    return this.statsService.getStats(from ?? sevenDaysAgo, to ?? today);
  }
}
