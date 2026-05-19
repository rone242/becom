import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('summary')
  getSummary() { return this.analyticsService.getSummary(); }

  @Get('revenue')
  getRevenue(@Query('period') period: 'months' | 'weeks' = 'months') {
    return this.analyticsService.getRevenueOverTime(period);
  }

  @Get('sales-by-category')
  getSalesByCategory() { return this.analyticsService.getSalesByCategory(); }

  @Get('recent-orders')
  getRecentOrders(@Query('limit') limit = 10) {
    return this.analyticsService.getRecentOrders(+limit);
  }
}
