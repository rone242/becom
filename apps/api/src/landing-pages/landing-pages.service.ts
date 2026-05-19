import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsBoolean, IsNumber, IsOptional, IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import slugify from 'slugify';
import { PrismaService } from '../prisma/prisma.service';

export class CreateLandingPageDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() productId: string;
  @ApiPropertyOptional() @IsString() @IsOptional() subtitle?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() badgeText?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() ctaText?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() heroImage?: string;
  @ApiPropertyOptional() @IsArray() @IsOptional() galleryImages?: string[];
  @ApiPropertyOptional() @IsNumber() @IsOptional() @Type(() => Number) priceOverride?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() introTitle?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() introText?: string;
  @ApiPropertyOptional() @IsArray() @IsOptional() benefits?: string[];
  @ApiPropertyOptional() @IsArray() @IsOptional() usageTips?: string[];
  @ApiPropertyOptional() @IsString() @IsOptional() highlightText?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() @Type(() => Number) sortOrder?: number;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isActive?: boolean;
}

@Injectable()
export class LandingPagesService {
  constructor(private prisma: PrismaService) {}

  private get landingPages() {
    return (this.prisma as any).landingPage;
  }

  findAll() {
    return this.landingPages.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: { product: { include: { category: true } } },
    });
  }

  async findBySlug(slug: string) {
    const page = await this.landingPages.findFirst({
      where: { slug, isActive: true },
      include: {
        product: {
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
        },
      },
    });
    if (!page) throw new NotFoundException(`Landing page "${slug}" not found`);
    return page;
  }

  create(dto: CreateLandingPageDto) {
    const slug = slugify(dto.title, { lower: true, strict: true });
    return this.landingPages.create({
      data: {
        ...dto,
        slug,
        galleryImages: dto.galleryImages || [],
        benefits: dto.benefits || [],
        usageTips: dto.usageTips || [],
      },
      include: { product: { include: { category: true } } },
    });
  }

  async update(id: string, dto: Partial<CreateLandingPageDto>) {
    await this.findById(id);
    const data: any = { ...dto };
    if (dto.title) data.slug = slugify(dto.title, { lower: true, strict: true });
    return this.landingPages.update({
      where: { id },
      data,
      include: { product: { include: { category: true } } },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.landingPages.update({ where: { id }, data: { isActive: false } });
  }

  private async findById(id: string) {
    const page = await this.landingPages.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Landing page not found');
    return page;
  }
}
