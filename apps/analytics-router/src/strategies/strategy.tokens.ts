/**
 * NestJS injection tokens for the strategy implementations.
 *
 * Using Symbol tokens (instead of class references) keeps the processor
 * fully decoupled — it never imports concrete strategy classes.
 * New platforms are added by creating a symbol here and registering in
 * StrategiesModule — zero changes to EventProcessor required.
 */
export const FACEBOOK_CAPI_STRATEGY     = Symbol('FACEBOOK_CAPI_STRATEGY');
export const GOOGLE_ANALYTICS_4_STRATEGY = Symbol('GOOGLE_ANALYTICS_4_STRATEGY');
export const TIKTOK_CAPI_STRATEGY       = Symbol('TIKTOK_CAPI_STRATEGY');
