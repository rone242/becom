import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UploadsController } from './uploads.controller';
import { R2Service } from './r2.service';
import { LocalStorageService } from './local-storage.service';

// Token used to inject whichever storage driver is active
export const STORAGE_SERVICE = 'STORAGE_SERVICE';

@Module({
  imports: [
    ConfigModule,
    MulterModule.register({ storage: undefined }), // memory storage for streaming
  ],
  controllers: [UploadsController],
  providers: [
    R2Service,
    LocalStorageService,
    {
      provide: STORAGE_SERVICE,
      useFactory: (config: ConfigService, r2: R2Service, local: LocalStorageService) => {
        const driver = config.get<string>('STORAGE_DRIVER') || 'r2';
        if (driver === 'local') {
          console.log('📦 Storage driver: LOCAL (VPS disk)');
          return local;
        }
        console.log('☁️  Storage driver: Cloudflare R2');
        return r2;
      },
      inject: [ConfigService, R2Service, LocalStorageService],
    },
  ],
  exports: [STORAGE_SERVICE, R2Service, LocalStorageService],
})
export class UploadsModule {}
