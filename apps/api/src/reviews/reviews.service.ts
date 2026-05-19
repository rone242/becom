import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { productId: string; userId: string; rating: number; comment: string }) {
    const review = await this.prisma.review.upsert({
      where: { productId_userId: { productId: data.productId, userId: data.userId } },
      create: data,
      update: { rating: data.rating, comment: data.comment },
      include: { user: { select: { id: true, name: true } } },
    });
    // Recalculate product rating
    await this.updateProductRating(data.productId);
    return review;
  }

  async findByProduct(productId: string) {
    return this.prisma.review.findMany({
      where: { productId, isVisible: true },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async updateProductRating(productId: string) {
    const reviews = await this.prisma.review.findMany({ where: { productId, isVisible: true } });
    const count = reviews.length;
    const avg = count > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
    await this.prisma.product.update({
      where: { id: productId },
      data: { rating: Math.round(avg * 10) / 10, reviewCount: count },
    });
  }
}
