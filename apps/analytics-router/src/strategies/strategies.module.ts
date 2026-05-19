import { Module } from '@nestjs/common';
import { FacebookCapiStrategy } from './facebook-capi.strategy';
import { GoogleAnalytics4Strategy } from './google-analytics4.strategy';
import { TikTokCapiStrategy } from './tiktok-capi.strategy';
import {
  FACEBOOK_CAPI_STRATEGY,
  GOOGLE_ANALYTICS_4_STRATEGY,
  TIKTOK_CAPI_STRATEGY,
} from './strategy.tokens';

/**
 * Registers all strategy implementations as named providers using Symbol tokens.
 *
 * To add a new platform (e.g., Pinterest CAPI):
 *   1. Create strategy.tokens.ts → export PINTEREST_CAPI_STRATEGY = Symbol(...)
 *   2. Implement PinterestCapiStrategy implements AnalyticsStrategy
 *   3. Add it to the providers array below
 *   4. Add it to PLATFORM_STRATEGY_MAP in event.processor.ts
 *   5. Add PINTEREST_CAPI to the AnalyticsPlatform enum in schema.prisma
 *
 * Zero changes to EventProcessor or any other module required.
 */
@Module({
  providers: [
    // Concrete implementations
    FacebookCapiStrategy,
    GoogleAnalytics4Strategy,
    TikTokCapiStrategy,

    // Symbol-keyed provider aliases — this is what ModuleRef.get(token) resolves
    {
      provide: FACEBOOK_CAPI_STRATEGY,
      useExisting: FacebookCapiStrategy,
    },
    {
      provide: GOOGLE_ANALYTICS_4_STRATEGY,
      useExisting: GoogleAnalytics4Strategy,
    },
    {
      provide: TIKTOK_CAPI_STRATEGY,
      useExisting: TikTokCapiStrategy,
    },
  ],
  exports: [
    FacebookCapiStrategy,
    GoogleAnalytics4Strategy,
    TikTokCapiStrategy,
    FACEBOOK_CAPI_STRATEGY,
    GOOGLE_ANALYTICS_4_STRATEGY,
    TIKTOK_CAPI_STRATEGY,
  ],
})
export class StrategiesModule {}
