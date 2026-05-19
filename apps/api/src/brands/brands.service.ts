import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import slugify from 'slugify';

export class CreateBrandDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsString() @IsOptional() logo?: string;
}

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateBrandDto) {
    const slug = slugify(dto.name, { lower: true, strict: true });
    return this.prisma.brand.create({ data: { ...dto, slug } });
  }

  async update(id: string, dto: Partial<CreateBrandDto>) {
    return this.prisma.brand.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.brand.update({ where: { id }, data: { isActive: false } });
  }
}
