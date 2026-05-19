import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IntegrationService } from './integration.service';
import { IntegrationController } from './integration.controller';

@Module({
  imports: [
    // JwtModule needed by JwtAdminGuard
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [IntegrationController],
  providers: [IntegrationService],
  // Export so QueueModule (EventProcessor) can inject IntegrationService
  exports: [IntegrationService],
})
export class IntegrationModule {}
