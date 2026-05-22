import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LocalStorageService {
  private uploadDir: string;
  private publicUrl: string;

  constructor(private config: ConfigService) {
    // Directory where files will be saved on disk
    // In Docker: /app/uploads  |  In dev: ./uploads (relative to project root)
    this.uploadDir = this.config.get<string>('LOCAL_UPLOAD_DIR') || '/app/uploads';
    this.publicUrl = this.config.get<string>('LOCAL_PUBLIC_URL') || 'http://localhost:4000/uploads';

    // Create directory if it doesn't exist
    fs.mkdirSync(this.uploadDir, { recursive: true });
    console.log(`📁 Local storage ready at: ${this.uploadDir}`);
  }

  async uploadImage(
    buffer: Buffer,
    folder: 'products' | 'categories' | 'brands' | 'landing-pages' | 'hero-slider' = 'products',
  ): Promise<{ url: string; publicId: string }> {
    try {
      // 1. Optimize image using sharp (resize to max 800x800, convert to webp)
      const optimizedBuffer = await sharp(buffer)
        .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      // 2. Generate unique filename
      const filename = `${uuidv4()}.webp`;
      const subDir = path.join(this.uploadDir, folder);
      const filePath = path.join(subDir, filename);

      // 3. Ensure subdirectory exists
      fs.mkdirSync(subDir, { recursive: true });

      // 4. Save file to disk
      fs.writeFileSync(filePath, optimizedBuffer);

      // 5. Return public URL
      const publicId = `${folder}/${filename}`;
      const url = `${this.publicUrl}/${publicId}`;
      return { url, publicId };
    } catch (error) {
      console.error('Failed to save image to local storage:', error);
      throw new InternalServerErrorException('Failed to upload image');
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadDir, publicId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Failed to delete image from local storage:', error);
    }
  }
}
