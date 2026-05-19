import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsStrategy } from './analytics-strategy.interface';
import { EventJobData } from '../queue/event.queue';

/**
 * Credentials shape for Google Analytics 4 Measurement Protocol.
 */
interface GA4Credentials {
  measurementId: string; // e.g. "G-XXXXXXXXXX"
  apiSecret: string;     // GA4 Measurement Protocol API secret
}

/**
 * Google Analytics 4 Strategy — Measurement Protocol v2
 *
 * Uses the GA4 Measurement Protocol to send server-side events.
 * Reference: https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference
 *
 * NOTE: GA4 does NOT require PII hashing. User IDs are opaque client IDs.
 * The client_id is mandatory — we use userId or sessionId as a fallback.
 */
@Injectable()
export class GoogleAnalytics4Strategy implements AnalyticsStrategy {
  private readonly logger = new Logger(GoogleAnalytics4Strategy.name);
  private static readonly BASE_URL =
    'https://www.google-analytics.com/mp/collect';

  async execute(
    jobData: EventJobData,
    credentials: Record<string, string>,
  ): Promise<void> {
    const creds = credentials as unknown as GA4Credentials;

    // client_id is required by GA4 — use userId or sessionId
    const clientId =
      jobData.userData?.userId ??
      jobData.sessionId ??
      `anon_${Date.now()}`;

    const url =
      `${GoogleAnalytics4Strategy.BASE_URL}` +
      `?measurement_id=${creds.measurementId}&api_secret=${creds.apiSecret}`;

    // ── Map standard event name to GA4 convention ─────────────────────────
    // GA4 uses snake_case event names. Standard e-commerce events:
    const ga4EventName = this.mapToGa4EventName(jobData.eventName);

    // ── Build event parameters ────────────────────────────────────────────
    const params: Record<string, unknown> = {
      engagement_time_msec: '100',
    };

    if (jobData.customData?.value !== undefined) {
      params['value'] = jobData.customData.value;
      params['currency'] = jobData.customData.currency ?? 'BDT';
    }
    if (jobData.customData?.orderId) {
      params['transaction_id'] = jobData.customData.orderId;
    }
    if (jobData.customData?.contentId) {
      params['items'] = [
        {
          item_id: jobData.customData.contentId,
          quantity: jobData.customData.numItems ?? 1,
          price: jobData.customData.value,
        },
      ];
    }
    if (jobData.pageUrl) {
      params['page_location'] = jobData.pageUrl;
    }

    const payload = {
      client_id: clientId,
      timestamp_micros: String(
        new Date(jobData.eventTime).getTime() * 1_000,
      ),
      non_personalized_ads: false,
      events: [
        {
          name: ga4EventName,
          params,
        },
      ],
    };

    // ── Native fetch — NO SDK ─────────────────────────────────────────────
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // GA4 Measurement Protocol always returns 204 No Content on success
    if (response.status !== 204 && !response.ok) {
      const body = await response.text();
      throw new Error(`GA4 HTTP ${response.status}: ${body}`);
    }

    this.logger.debug(`GA4: ${ga4EventName} sent for client_id=${clientId}`);
  }

  /**
   * Maps our internal event names to GA4-standard snake_case event names.
   * Reference: https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference/events
   */
  private mapToGa4EventName(eventName: string): string {
    const map: Record<string, string> = {
      Purchase:              'purchase',
      ViewContent:           'view_item',
      AddToCart:             'add_to_cart',
      InitiateCheckout:      'begin_checkout',
      Search:                'search',
      CompleteRegistration:  'sign_up',
      Lead:                  'generate_lead',
      PageView:              'page_view',
    };
    return map[eventName] ?? eventName.toLowerCase().replace(/\s+/g, '_');
  }
}
