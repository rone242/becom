import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CourierService } from './courier.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';

@ApiTags('Courier')
@Controller('courier')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class CourierController {
  constructor(private courierService: CourierService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get current Steadfast wallet balance' })
  getBalance() { return this.courierService.getBalance(); }

  @Get('booked')
  @ApiOperation({ summary: 'Get all orders booked with Steadfast' })
  getBookedOrders() { return this.courierService.getBookedOrders(); }

  @Post('book/:orderId')
  @ApiOperation({ summary: 'Book a single order with Steadfast' })
  bookOrder(@Param('orderId') orderId: string) {
    return this.courierService.bookOrder(orderId);
  }

  @Get('status/:orderId')
  @ApiOperation({ summary: 'Refresh courier status for an order from Steadfast' })
  refreshStatus(@Param('orderId') orderId: string) {
    return this.courierService.refreshStatus(orderId);
  }

  @Get('track/:trackingCode')
  @ApiOperation({ summary: 'Check delivery status by tracking code (public-ish)' })
  checkByTracking(@Param('trackingCode') trackingCode: string) {
    return this.courierService.checkStatusByTracking(trackingCode);
  }

  @Post('return/:orderId')
  @ApiOperation({ summary: 'Create a return request for an order' })
  createReturn(
    @Param('orderId') orderId: string,
    @Body('reason') reason?: string,
  ) {
    return this.courierService.createReturnRequest(orderId, reason);
  }

  @Get('returns')
  @ApiOperation({ summary: 'Get all return requests from Steadfast' })
  getReturns() { return this.courierService.getReturnRequests(); }

  @Get('payments')
  @ApiOperation({ summary: 'Get Steadfast payments list' })
  getPayments() { return this.courierService.getPayments(); }

  @Get('police-stations')
  @ApiOperation({ summary: 'Get list of police stations (for address lookup)' })
  getPoliceStations() { return this.courierService.getPoliceStations(); }
}
