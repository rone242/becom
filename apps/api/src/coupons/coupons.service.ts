import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateCouponDto {
  @ApiProperty() @IsString() code: string;
  @ApiProperty() orderTotal: number;
}

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async validate(dto: ValidateCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: dto.code } });
    if (!coupon || !coupon.isActive) throw new BadRequestException('Invalid coupon code');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new BadRequestException('Coupon has expired');
    if (coupon.minOrder && dto.orderTotal < coupon.minOrder) {
      throw new BadRequestException(`Minimum order of ৳${coupon.minOrder} required`);
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) throw new BadRequestException('Coupon limit reached');

    const discount = coupon.type === 'PERCENTAGE'
      ? (dto.orderTotal * coupon.discount) / 100
      : coupon.discount;

    return { valid: true, coupon, discount: Math.round(discount * 100) / 100 };
  }

  async findAll() { return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } }); }

  async findPublic() {
    return this.prisma.coupon.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: {
        code: true,
        description: true,
        discount: true,
        type: true,
        minOrder: true,
        expiresAt: true,
        maxUses: true,
        usedCount: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: any) { return this.prisma.coupon.create({ data }); }
  async update(id: string, data: any) { return this.prisma.coupon.update({ where: { id }, data }); }
  async remove(id: string) { return this.prisma.coupon.update({ where: { id }, data: { isActive: false } }); }
}
