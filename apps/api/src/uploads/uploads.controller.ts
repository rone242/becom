import {
  Controller, Post, UploadedFile, UseInterceptors, Query, UseGuards, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { R2Service } from './r2.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';

@ApiTags('Uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class UploadsController {
  constructor(private r2Service: R2Service) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder: 'products' | 'categories' | 'brands' | 'landing-pages' | 'hero-slider' = 'products',
  ) {
    if (!file) throw new BadRequestException('No file provided');
    const result = await this.r2Service.uploadImage(file.buffer, folder);
    return { url: result.url, publicId: result.publicId };
  }
}
