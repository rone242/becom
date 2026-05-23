import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor(private config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: this.config.getOrThrow<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Upload an image buffer to Cloudinary.
   * Cloudinary applies the eager transformation (resize + WebP) automatically.
   */
  async uploadImage(
    buffer: Buffer,
    folder: 'products' | 'categories' | 'brands' | 'landing-pages' | 'hero-slider' = 'products',
  ): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `organic-harvest/${folder}`,
          resource_type: 'image',
          // Server-side transformation: resize to max 800x800 and convert to WebP
          eager: [
            { width: 800, height: 800, crop: 'limit', format: 'webp', quality: 'auto' },
          ],
          eager_async: false,
        },
        (error, result: UploadApiResponse) => {
          if (error || !result) {
            console.error('Cloudinary upload failed:', error);
            return reject(
              new InternalServerErrorException('Failed to upload image to Cloudinary'),
            );
          }

          // Use the eager-transformed URL if available, else fall back to the original
          const url =
            result.eager?.[0]?.secure_url ?? result.secure_url;

          resolve({ url, publicId: result.public_id });
        },
      );

      // Pipe the buffer into the upload stream
      const readable = new Readable();
      readable.push(buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }

  /**
   * Delete an image from Cloudinary by its public_id.
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Failed to delete image from Cloudinary:', error);
    }
  }
}
