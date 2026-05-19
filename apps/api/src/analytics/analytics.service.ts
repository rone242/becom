import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getSummary() {
    const [totalRevenue, totalOrders, totalUsers, orderStatuses] = await Promise.all([
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { not: 'CANCELLED' } },
      }),
      this.prisma.order.count({ where: { status: { not: 'CANCELLED' } } }),
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.order.groupBy({ by: ['status'], _count: true }),
    ]);

    // Last 30 days vs previous 30 days for growth
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [currentRevenue, prevRevenue, currentOrders, prevOrders] = await Promise.all([
      this.prisma.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: thirtyDaysAgo }, status: { not: 'CANCELLED' } } }),
      this.prisma.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }, status: { not: 'CANCELLED' } } }),
      this.prisma.order.count({ where: { createdAt: { gte: thirtyDaysAgo }, status: { not: 'CANCELLED' } } }),
      this.prisma.order.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }, status: { not: 'CANCELLED' } } }),
    ]);

    const revenueGrowth = prevRevenue._sum.total
      ? (((currentRevenue._sum.total ?? 0) - (prevRevenue._sum.total ?? 0)) / prevRevenue._sum.total) * 100
      : 0;

    return {
      totalRevenue: totalRevenue._sum.total ?? 0,
      totalOrders,
      totalUsers,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      orderStatuses,
      currentPeriodRevenue: currentRevenue._sum.total ?? 0,
    };
  }

  async getRevenueOverTime(period: 'months' | 'weeks' = 'months') {
    const days = period === 'months' ? 180 : 56;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: since }, status: { not: 'CANCELLED' } },
      select: { createdAt: true, total: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by week or month
    const grouped: Record<string, number> = {};
    for (const order of orders) {
      const d = order.createdAt;
      const key = period === 'months'
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        : `${d.getFullYear()}-W${Math.ceil(d.getDate() / 7)}`;
      grouped[key] = (grouped[key] ?? 0) + order.total;
    }

    return Object.entries(grouped).map(([label, revenue]) => ({ label, revenue }));
  }

  async getSalesByCategory() {
    const categories = await this.prisma.category.findMany({
      include: {
        products: {
          include: { orderItems: { select: { quantity: true, price: true } } },
        },
      },
    });

    return categories.map((cat) => {
      const revenue = cat.products.reduce((sum, p) => {
        return sum + p.orderItems.reduce((s, oi) => s + oi.quantity * oi.price, 0);
      }, 0);
      return { category: cat.name, revenue };
    }).sort((a, b) => b.revenue - a.revenue);
  }

  async getRecentOrders(limit = 10) {
    return this.prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }
}
