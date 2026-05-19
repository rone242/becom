import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class R2Service {
  private s3: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(private config: ConfigService) {
    const accountId = this.config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    
    this.bucketName = this.config.get<string>('R2_BUCKET_NAME') || '';
    this.publicUrl = this.config.get<string>('R2_PUBLIC_URL') || '';

    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucketName || !this.publicUrl) {
      console.warn('⚠️ Cloudflare R2 credentials are not fully configured in .env');
    }

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });
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
      const key = `organic-harvest/${folder}/${filename}`;

      // 3. Upload to Cloudflare R2
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: optimizedBuffer,
        ContentType: 'image/webp',
        // ACL: 'public-read' is generally not needed if the bucket is configured for public access
      });

      await this.s3.send(command);

      // 4. Return the public URL
      const url = `${this.publicUrl}/${key}`;
      return { url, publicId: key };
    } catch (error) {
      console.error('Failed to upload image to R2:', error);
      throw new InternalServerErrorException('Failed to upload image');
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    // Implement delete logic if needed
    // const command = new DeleteObjectCommand({ Bucket: this.bucketName, Key: publicId });
    // await this.s3.send(command);
  }
}
