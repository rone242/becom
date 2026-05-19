import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Supported event names aligned with Meta / GA4 / TikTok standard events.
 * Extend as needed.
 */
export enum EventName {
  PURCHASE       = 'Purchase',
  VIEW_CONTENT   = 'ViewContent',
  ADD_TO_CART    = 'AddToCart',
  INITIATE_CHECKOUT = 'InitiateCheckout',
  SEARCH         = 'Search',
  COMPLETE_REGISTRATION = 'CompleteRegistration',
  LEAD           = 'Lead',
  PAGE_VIEW      = 'PageView',
}

/**
 * Optional user data included with the event.
 * PII fields (email, phone) will be SHA-256 hashed before being forwarded.
 */
export class UserDataDto {
  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+8801712345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'clxyz123' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: '1990-01-25' })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'Bangladesh' })
  @IsOptional()
  @IsString()
  country?: string;
}

/**
 * Optional custom data payload for events with monetary value.
 */
export class CustomDataDto {
  @ApiPropertyOptional({ example: 1250.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @ApiPropertyOptional({ example: 'BDT' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ example: 'prod_abc123' })
  @IsOptional()
  @IsString()
  contentId?: string;

  @ApiPropertyOptional({ example: 'product' })
  @IsOptional()
  @IsString()
  contentType?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  numItems?: number;

  @ApiPropertyOptional({ example: 'ORD-2024-001' })
  @IsOptional()
  @IsString()
  orderId?: string;
}

/**
 * Main event payload DTO sent by the Next.js frontend.
 */
export class TrackEventDto {
  @ApiProperty({ enum: EventName, example: EventName.PURCHASE })
  @IsEnum(EventName)
  @IsNotEmpty()
  eventName!: EventName;

  @ApiPropertyOptional({ type: UserDataDto })
  @IsOptional()
  @IsObject()
  userData?: UserDataDto;

  @ApiPropertyOptional({ type: CustomDataDto })
  @IsOptional()
  @IsObject()
  customData?: CustomDataDto;

  /**
   * ISO 8601 event timestamp. Defaults to server time if omitted.
   * Meta requires events within 7 days; TikTok within 28 days.
   */
  @ApiPropertyOptional({ example: '2024-05-15T10:30:00Z' })
  @IsOptional()
  @IsString()
  eventTime?: string;

  /** Browser client IP — forwarded from the Next.js server-side request. */
  @ApiPropertyOptional({ example: '203.0.113.42' })
  @IsOptional()
  @IsString()
  clientIp?: string;

  /** Browser User-Agent. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userAgent?: string;

  /** Current page URL. */
  @ApiPropertyOptional({ example: 'https://example.com/products/organic-honey' })
  @IsOptional()
  @IsString()
  pageUrl?: string;

  /** Browser session / anonymous ID (for anonymous users). */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionId?: string;
}
