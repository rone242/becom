import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role, AnalyticsPlatform } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';

// Map from frontend section key → Prisma field name on SiteSetting
const SECTION_FIELD_MAP: Record<string, string> = {
  advancePayment:     'advancePayment',
  paymentMethods:     'paymentMethods',
  invoiceSettings:    'invoiceSettings',
  rewardPoints:       'rewardPoints',
  smsSettings:        'smsSettings',
  courierSettings:    'courierSettings',
  fraudCheckApi:      'fraudCheckApi',
  socialLogin:        'socialLogin',
  chatManagement:     'chatManagement',
  facebookCatalog:    'facebookCatalog',
  orderSettings:      'orderSettings',
  productSettings:    'productSettings',
  currencyCountry:    'currencyCountry',
  domainSettings:     'domainSettings',
  blogSettings:       'blogSettings',
  googleSearchConsole:'googleSearchConsole',
  manageOffers:       'manageOffers',
};

// Map from frontend platform key → Prisma enum
const PLATFORM_MAP: Record<string, AnalyticsPlatform> = {
  facebook:  AnalyticsPlatform.FACEBOOK_CAPI,
  tiktok:    AnalyticsPlatform.TIKTOK_CAPI,
  google:    AnalyticsPlatform.GOOGLE_ANALYTICS_4,
};

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private prisma: PrismaService) {}

  // ── Public endpoints ────────────────────────────────────────────────────────

  @Get()
  getSettings() { return this.prisma.siteSetting.findFirst(); }

  @Get('all')
  async getAllSettings() {
    const site = await this.prisma.siteSetting.findFirst();
    const integrations = await this.prisma.integrationSetting.findMany();
    return { site, integrations };
  }

  @Get('delivery')
  async getDeliveryConfig() {
    const config = await this.prisma.deliveryConfig.findFirst();
    if (!config) return null;
    return {
      id: config.id,
      insideCity: config.insideDhaka,
      outsideCity: config.outsideDhaka,
      freeAbove: config.freeDeliveryAt,
      zoneBased: true,
    };
  }

  @Get('integrations')
  async getIntegrations() {
    const rows = await this.prisma.integrationSetting.findMany();
    // Return as a flat map: { facebook: {...}, tiktok: {...}, google: {...} }
    const result: Record<string, any> = {};
    for (const [key, platform] of Object.entries(PLATFORM_MAP)) {
      const row = rows.find((r) => r.platform === platform);
      result[key] = row
        ? { isActive: row.isActive, credentials: row.credentials }
        : { isActive: false, credentials: {} };
    }
    return result;
  }

  // ── Admin-only endpoints ────────────────────────────────────────────────────

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN) @ApiBearerAuth()
  async updateSettings(@Body() data: any) {
    try {
      const existing = await this.prisma.siteSetting.findFirst();
      if (!existing) {
        return this.prisma.siteSetting.create({ data });
      }
      return this.prisma.siteSetting.update({ where: { id: existing.id }, data });
    } catch (error) {
      console.error('Settings update error:', error);
      throw error;
    }
  }

  @Patch('delivery')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN) @ApiBearerAuth()
  async updateDelivery(@Body() data: any) {
    try {
      const existing = await this.prisma.deliveryConfig.findFirst();
      const updateData = {
        insideDhaka:   data.insideCity  !== undefined ? Number(data.insideCity)  : undefined,
        outsideDhaka:  data.outsideCity !== undefined ? Number(data.outsideCity) : undefined,
        freeDeliveryAt: data.freeAbove  !== undefined ? (data.freeAbove === null ? null : Number(data.freeAbove)) : undefined,
      };
      if (!existing) {
        return await this.prisma.deliveryConfig.create({
          data: { id: 'default', insideDhaka: updateData.insideDhaka ?? 60, outsideDhaka: updateData.outsideDhaka ?? 100, freeDeliveryAt: updateData.freeDeliveryAt ?? null },
        });
      }
      return await this.prisma.deliveryConfig.update({ where: { id: existing.id }, data: updateData });
    } catch (error) {
      console.error('Delivery config update error:', error);
      throw error;
    }
  }

  @Patch('section/:key')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN) @ApiBearerAuth()
  async updateSection(@Param('key') key: string, @Body() data: any) {
    const field = SECTION_FIELD_MAP[key];
    if (!field) {
      throw new Error(`Unknown settings section: ${key}`);
    }
    const existing = await this.prisma.siteSetting.findFirst();
    if (!existing) {
      return this.prisma.siteSetting.create({ data: { [field]: data } });
    }
    return this.prisma.siteSetting.update({
      where: { id: existing.id },
      data: { [field]: data },
    });
  }

  @Patch('integrations/:platform')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN) @ApiBearerAuth()
  async updateIntegration(
    @Param('platform') platformKey: string,
    @Body() body: { isActive?: boolean; credentials?: Record<string, unknown> },
  ) {
    const platform = PLATFORM_MAP[platformKey];
    if (!platform) throw new Error(`Unknown platform: ${platformKey}`);

    return this.prisma.integrationSetting.upsert({
      where: { platform },
      create: { platform, isActive: body.isActive ?? false, credentials: (body.credentials ?? {}) as any },
      update: { isActive: body.isActive ?? false, credentials: (body.credentials ?? {}) as any },
    });
  }
}
