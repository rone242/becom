import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadsController } from './uploads.controller';
import { R2Service } from './r2.service';

@Module({
  imports: [MulterModule.register({ storage: undefined })], // use memory storage for streaming
  controllers: [UploadsController],
  providers: [R2Service],
  exports: [R2Service],
})
export class UploadsModule {}
