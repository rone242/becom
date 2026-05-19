import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnalyticsPlatform } from '@prisma/client';

export class UpdateIntegrationDto {
  @ApiPropertyOptional({
    description: 'Enable or disable this integration',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description:
      'JSON credentials blob. Shape depends on platform. ' +
      'Facebook: { pixelId, accessToken, testEventCode? }. ' +
      'GA4: { measurementId, apiSecret }. ' +
      'TikTok: { pixelCode, accessToken }.',
    example: { pixelId: '1234567890', accessToken: 'EAABsb...' },
  })
  @IsOptional()
  @IsObject()
  credentials?: Record<string, unknown>;
}

export class CreateIntegrationDto {
  @ApiProperty({ enum: AnalyticsPlatform, example: 'FACEBOOK_CAPI' })
  @IsEnum(AnalyticsPlatform)
  @IsNotEmpty()
  platform!: AnalyticsPlatform;

  @ApiProperty({ example: true })
  @IsBoolean()
  isActive!: boolean;

  @ApiProperty({
    example: { pixelId: '1234567890', accessToken: 'EAABsb...' },
  })
  @IsObject()
  credentials!: Record<string, unknown>;
}
