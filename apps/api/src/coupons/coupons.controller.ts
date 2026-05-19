import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CouponsService, ValidateCouponDto } from './coupons.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private couponsService: CouponsService) {}

  @Post('validate')
  validate(@Body() dto: ValidateCouponDto) { return this.couponsService.validate(dto); }

  @Get('public')
  findPublic() { return this.couponsService.findPublic(); }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN) @ApiBearerAuth()
  findAll() { return this.couponsService.findAll(); }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN) @ApiBearerAuth()
  create(@Body() data: any) { return this.couponsService.create(data); }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN) @ApiBearerAuth()
  update(@Param('id') id: string, @Body() data: any) { return this.couponsService.update(id, data); }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN) @ApiBearerAuth()
  remove(@Param('id') id: string) { return this.couponsService.remove(id); }
}
