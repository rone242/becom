import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadsController } from './uploads.controller';
import { CloudinaryService } from './cloudinary.service';
import { STORAGE_SERVICE } from './uploads.constants';

// Re-export so other modules can import from one place

@Module({
  imports: [
    MulterModule.register({ storage: undefined }), // memory storage
  ],
  controllers: [UploadsController],
  providers: [
    CloudinaryService,
    {
      provide: STORAGE_SERVICE,
      useFactory: (svc: CloudinaryService) => svc,
      inject: [CloudinaryService],
    },
  ],
  exports: [STORAGE_SERVICE, CloudinaryService],
})
export class UploadsModule {}
