import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  IsString, IsNumber, IsOptional, IsBoolean, IsArray, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import slugify from 'slugify';
import { RedisService } from '../redis/redis.service';

export class CreateProductDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() description: string;
  @ApiProperty() @IsNumber() @Type(() => Number) price: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() @Type(() => Number) comparePrice?: number;
  @ApiProperty() @IsArray() images: string[];
  @ApiPropertyOptional() @IsNumber() @IsOptional() @Type(() => Number) stock?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() weight?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isOrganic?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isFeatured?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isNewArrival?: boolean;
  @ApiPropertyOptional() @IsString() @IsOptional() details?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() termsAndConditions?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() whatsappText?: string;
  @ApiProperty() @IsString() categoryId: string;
  @ApiPropertyOptional() @IsString() @IsOptional() brandId?: string;
}

export class ProductQueryDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsBoolean() @Transform(({ value }) => value === 'true') isFeatured?: boolean;
  @IsOptional() @IsBoolean() @Transform(({ value }) => value === 'true') isNewArrival?: boolean;
  @IsOptional() @IsBoolean() @Transform(({ value }) => value === 'true') isOrganic?: boolean;
  @IsOptional() @IsNumber() @Type(() => Number) @Min(1) page?: number = 1;
  @IsOptional() @IsNumber() @Type(() => Number) @Min(1) limit?: number = 12;
  @IsOptional() @IsString() sortBy?: string = 'createdAt';
  @IsOptional() @IsString() order?: 'asc' | 'desc' = 'desc';
}

@Injectable()
export class ProductsService {
  private readonly cacheTtlSeconds = 60;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async findAll(query: ProductQueryDto) {
    const cacheKey = this.getCacheKey('products:list', query);
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const {
      category, brand, search, isFeatured, isNewArrival, isOrganic,
      page = 1, limit = 12, sortBy = 'createdAt', order = 'desc',
    } = query;

    const where: any = { isActive: true };
    if (category) where.category = { slug: category };
    if (brand) where.brand = { slug: brand };
    if (isFeatured !== undefined) where.isFeatured = isFeatured;
    if (isNewArrival !== undefined) where.isNewArrival = isNewArrival;
    if (isOrganic !== undefined) where.isOrganic = isOrganic;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: { category: true, brand: true },
        orderBy: { [sortBy]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const result = { products, total, page, limit, totalPages: Math.ceil(total / limit) };
    await this.redis.set(cacheKey, result, this.cacheTtlSeconds);
    return result;
  }

  async findFeaturedByCategory() {
    const cacheKey = 'products:featured-by-category';
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        products: {
          where: { isActive: true, isFeatured: true },
          take: 4,
          include: { brand: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    const result = categories.filter((c) => c.products.length > 0);
    await this.redis.set(cacheKey, result, this.cacheTtlSeconds);
    return result;
  }

  async findBySlug(slug: string) {
    const cacheKey = `products:slug:${slug}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        brand: true,
        reviews: {
          where: { isVisible: true },
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!product) throw new NotFoundException(`Product "${slug}" not found`);

    // Related products from same category
    const related = await this.prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        isActive: true,
        NOT: { id: product.id },
      },
      take: 8,
      include: { brand: true },
    });

    const result = { ...product, related };
    await this.redis.set(cacheKey, result, this.cacheTtlSeconds);
    return result;
  }

  async create(dto: CreateProductDto) {
    const slug = slugify(dto.name, { lower: true, strict: true });
    const product = await this.prisma.product.create({
      data: { ...dto, slug },
      include: { category: true, brand: true },
    });
    await this.redis.delByPattern('products:*');
    return product;
  }

  async update(id: string, dto: Partial<CreateProductDto>) {
    const data: any = { ...dto };
    if (dto.name) data.slug = slugify(dto.name, { lower: true, strict: true });
    const product = await this.prisma.product.update({
      where: { id },
      data,
      include: { category: true, brand: true },
    });
    await this.redis.delByPattern('products:*');
    return product;
  }

  async remove(id: string) {
    const product = await this.prisma.product.update({ where: { id }, data: { isActive: false } });
    await this.redis.delByPattern('products:*');
    return product;
  }

  async updateRating(productId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { productId, isVisible: true },
    });
    const count = reviews.length;
    const avg = count > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
    await this.prisma.product.update({
      where: { id: productId },
      data: { rating: Math.round(avg * 10) / 10, reviewCount: count },
    });
    await this.redis.delByPattern('products:*');
  }

  private getCacheKey(prefix: string, query: ProductQueryDto) {
    const normalized = Object.keys(query || {})
      .sort()
      .reduce((acc, key) => ({ ...acc, [key]: query[key] }), {});

    return `${prefix}:${JSON.stringify(normalized)}`;
  }
}
