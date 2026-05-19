import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsEnum, IsArray, IsOptional, ValidateNested, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DeliveryZone } from '@prisma/client';

export class OrderItemDto {
  @ApiProperty() @IsString() productId: string;
  @ApiProperty() @IsNumber() @Type(() => Number) quantity: number;
}

export class CreateOrderDto {
  @ApiProperty() @IsString() customerName: string;
  @ApiProperty() @IsString() customerPhone: string;
  @ApiProperty() @IsString() address: string;
  @ApiProperty({ enum: DeliveryZone }) @IsEnum(DeliveryZone) deliveryZone: DeliveryZone;
  @ApiPropertyOptional() @IsString() @IsOptional() couponCode?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() note?: string;
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOrderDto, userId?: string) {
    // Get delivery charges
    const deliveryConfig = await this.prisma.deliveryConfig.findFirst();
    const deliveryCharge = dto.deliveryZone === DeliveryZone.INSIDE_DHAKA
      ? (deliveryConfig?.insideDhaka ?? 60)
      : (deliveryConfig?.outsideDhaka ?? 100);

    // Validate products and calculate subtotal
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds } } });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    let subtotal = 0;
    const orderItems = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;
      subtotal += product.price * item.quantity;
      return {
        productId: item.productId,
        productName: product.name,
        productImage: product.images[0] || null,
        quantity: item.quantity,
        price: product.price,
      };
    });

    // Apply coupon
    let discount = 0;
    let couponId: string | undefined;
    if (dto.couponCode) {
      const coupon = await this.prisma.coupon.findUnique({ where: { code: dto.couponCode } });
      if (!coupon || !coupon.isActive) throw new BadRequestException('Invalid coupon code');
      if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new BadRequestException('Coupon expired');
      if (coupon.minOrder && subtotal < coupon.minOrder) {
        throw new BadRequestException(`Minimum order of ৳${coupon.minOrder} required for this coupon`);
      }
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        throw new BadRequestException('Coupon usage limit reached');
      }
      discount = coupon.type === 'PERCENTAGE' ? (subtotal * coupon.discount) / 100 : coupon.discount;
      couponId = coupon.id;
      await this.prisma.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
    }

    const total = subtotal - discount + deliveryCharge;

    const order = await this.prisma.order.create({
      data: {
        userId: userId || null,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        address: dto.address,
        deliveryZone: dto.deliveryZone,
        deliveryCharge,
        subtotal,
        discount,
        total,
        note: dto.note,
        couponId,
        items: { create: orderItems },
      },
      include: { items: { include: { product: true } }, coupon: true },
    });

    return order;
  }

  async findAll(userId?: string, isAdmin?: boolean) {
    const where = isAdmin ? {} : { userId: userId || 'none' };
    return this.prisma.order.findMany({
      where,
      include: { items: true, coupon: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, coupon: true, user: { select: { name: true, phone: true, email: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.order.update({ where: { id }, data: { status: status as any } });
  }
}
