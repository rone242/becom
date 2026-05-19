import { Controller, Get, Post, Put, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CartService, AddToCartDto } from './cart.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  getCart(@Request() req, @Query('sessionId') sessionId?: string) {
    const userId = req.user?.id;
    return this.cartService.getCart(userId, sessionId);
  }

  @Post('items')
  addItem(@Body() dto: AddToCartDto, @Request() req, @Query('sessionId') sessionId?: string) {
    const userId = req.user?.id;
    return this.cartService.addItem(dto, userId, sessionId);
  }

  @Put('items/:itemId')
  updateItem(@Param('itemId') itemId: string, @Body('quantity') quantity: number) {
    return this.cartService.updateItem(itemId, quantity);
  }

  @Put('items/:itemId/remove')
  removeItem(@Param('itemId') itemId: string) {
    return this.cartService.removeItem(itemId);
  }
}
