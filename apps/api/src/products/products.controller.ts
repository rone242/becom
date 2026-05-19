import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ProductsService, CreateProductDto, ProductQueryDto } from './products.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: ProductQueryDto) { return this.productsService.findAll(query); }

  @Get('featured-by-category')
  findFeaturedByCategory() { return this.productsService.findFeaturedByCategory(); }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) { return this.productsService.findBySlug(slug); }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN) @ApiBearerAuth()
  create(@Body() dto: CreateProductDto) { return this.productsService.create(dto); }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN) @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: Partial<CreateProductDto>) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN) @ApiBearerAuth()
  remove(@Param('id') id: string) { return this.productsService.remove(id); }
}
