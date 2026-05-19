export { PrismaClient, Prisma } from '@prisma/client';
export type {
  // ─── Core Models ────────────────────────────────────────────────
  User,
  Category,
  Brand,
  Product,
  LandingPage,
  Cart,
  CartItem,
  Coupon,
  Order,
  OrderItem,
  Review,
  DeliveryConfig,
  SiteSetting,
  // ─── Analytics Router Models ─────────────────────────────────────
  IntegrationSetting,
  TrackingEvent,
} from '@prisma/client';

// ─── Enums (value exports — cannot use `export type` for runtime values) ──────
export {
  Role,
  OrderStatus,
  DeliveryZone,
  CouponType,
  // Analytics Router enums
  CustomerTier,
  AnalyticsPlatform,
} from '@prisma/client';
