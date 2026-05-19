import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsStrategy } from './analytics-strategy.interface';
import { EventJobData } from '../queue/event.queue';
import { hashPii, hashPhone } from '../common/crypto.util';

/**
 * Credentials shape for TikTok Events API.
 */
interface TikTokCredentials {
  pixelCode: string;   // TikTok Pixel ID
  accessToken: string; // Events API access token
}

/**
 * TikTok Events API (CAPI) Strategy — v1.3
 *
 * Sends server-side events to TikTok Events API (CAPI).
 * Reference: https://business-api.tiktok.com/portal/docs?id=1771101303285761
 *
 * PII Compliance (REQUIRED by TikTok):
 *  - Email and phone must be SHA-256 hashed (lowercase, trimmed).
 *  - See https://business-api.tiktok.com/portal/docs?id=1771101303285761#section-data-normalization
 */
@Injectable()
export class TikTokCapiStrategy implements AnalyticsStrategy {
  private readonly logger = new Logger(TikTokCapiStrategy.name);
  private static readonly API_URL =
    'https://business-api.tiktok.com/open_api/v1.3/event/track/';

  async execute(
    jobData: EventJobData,
    credentials: Record<string, string>,
  ): Promise<void> {
    const creds = credentials as unknown as TikTokCredentials;

    // ── Build context (user identity + browser context) ───────────────────
    const context: Record<string, unknown> = {
      ad: { callback: jobData.trackingId }, // Deduplication
    };

    if (jobData.userAgent) {
      context['user_agent'] = jobData.userAgent;
    }
    if (jobData.clientIp) {
      context['ip'] = jobData.clientIp;
    }
    if (jobData.pageUrl) {
      context['page'] = { url: jobData.pageUrl };
    }

    // ── Build hashed user object (PII compliance) ─────────────────────────
    const user: Record<string, string> = {};
    if (jobData.userData?.email) {
      user['email'] = hashPii(jobData.userData.email);
    }
    if (jobData.userData?.phone) {
      user['phone_number'] = hashPhone(jobData.userData.phone);
    }
    if (jobData.userData?.userId) {
      user['external_id'] = hashPii(jobData.userData.userId);
    }
    if (Object.keys(user).length > 0) {
      context['user'] = user;
    }

    // ── Build properties (custom data) ────────────────────────────────────
    const properties: Record<string, unknown> = {
      currency: jobData.customData?.currency ?? 'BDT',
    };
    if (jobData.customData?.value !== undefined) {
      properties['value'] = jobData.customData.value;
    }
    if (jobData.customData?.contentId) {
      properties['content_id'] = jobData.customData.contentId;
      properties['content_type'] = jobData.customData.contentType ?? 'product';
    }
    if (jobData.customData?.orderId) {
      properties['order_id'] = jobData.customData.orderId;
    }
    if (jobData.customData?.numItems !== undefined) {
      properties['quantity'] = jobData.customData.numItems;
    }

    // ── Map event name to TikTok standard event ───────────────────────────
    const tikTokEventName = this.mapEventName(jobData.eventName);

    // ── Assemble payload ──────────────────────────────────────────────────
    const payload = {
      pixel_code: creds.pixelCode,
      event: tikTokEventName,
      event_id: jobData.trackingId, // Deduplication across Web and Events API
      timestamp: new Date(jobData.eventTime).toISOString(),
      context,
      properties,
    };

    // ── Native fetch — NO SDK ─────────────────────────────────────────────
    const response = await fetch(TikTokCapiStrategy.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': creds.accessToken,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`TikTok CAPI HTTP ${response.status}: ${body}`);
    }

    const result = await response.json() as { code?: number; message?: string };
    if (result.code !== 0) {
      throw new Error(`TikTok CAPI error ${result.code}: ${result.message}`);
    }

    this.logger.debug(`TikTok CAPI: ${tikTokEventName} sent [${jobData.trackingId}]`);
  }

  /**
   * Maps internal event names to TikTok standard event names.
   * Reference: https://business-api.tiktok.com/portal/docs?id=1771101303285761#section-standard-events
   */
  private mapEventName(eventName: string): string {
    const map: Record<string, string> = {
      Purchase:              'PlaceAnOrder',
      ViewContent:           'ViewContent',
      AddToCart:             'AddToCart',
      InitiateCheckout:      'InitiateCheckout',
      Search:                'Search',
      CompleteRegistration:  'CompleteRegistration',
      Lead:                  'SubmitForm',
      PageView:              'Pageview',
    };
    return map[eventName] ?? eventName;
  }
}
