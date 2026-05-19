import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsStrategy } from './analytics-strategy.interface';
import { EventJobData } from '../queue/event.queue';
import { hashPii, hashPhone } from '../common/crypto.util';

/**
 * Credentials shape for Facebook Conversions API.
 * Stored in IntegrationSetting.credentials JSON column.
 */
interface FacebookCredentials {
  pixelId: string;
  accessToken: string;
  apiVersion?: string;    // Default: v21.0
  testEventCode?: string; // Only set in development/staging
}

/**
 * Facebook Conversions API (CAPI) Strategy
 *
 * Uses the Meta Conversions API v21.0 Measurement Protocol — no Meta SDK required.
 * Reference: https://developers.facebook.com/docs/marketing-api/conversions-api
 *
 * PII Compliance (REQUIRED by Meta):
 *  - Email and phone are SHA-256 hashed before transmission.
 *  - See https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
 */
@Injectable()
export class FacebookCapiStrategy implements AnalyticsStrategy {
  private readonly logger = new Logger(FacebookCapiStrategy.name);

  async execute(
    jobData: EventJobData,
    credentials: Record<string, string>,
  ): Promise<void> {
    const creds = credentials as unknown as FacebookCredentials;
    const apiVersion = creds.apiVersion ?? 'v21.0';
    const url = `https://graph.facebook.com/${apiVersion}/${creds.pixelId}/events?access_token=${creds.accessToken}`;

    // ── Build hashed user_data object (PII compliance) ───────────────────
    const user_data: Record<string, string | string[]> = {};

    if (jobData.userData?.email) {
      user_data['em'] = hashPii(jobData.userData.email);
    }
    if (jobData.userData?.phone) {
      user_data['ph'] = hashPhone(jobData.userData.phone);
    }
    if (jobData.userData?.userId) {
      // External ID does NOT require hashing per Meta docs
      user_data['external_id'] = jobData.userData.userId;
    }
    if (jobData.clientIp)   user_data['client_ip_address'] = jobData.clientIp;
    if (jobData.userAgent)  user_data['client_user_agent'] = jobData.userAgent;

    // ── Build custom_data ─────────────────────────────────────────────────
    const custom_data: Record<string, unknown> = {};
    if (jobData.customData?.value !== undefined) {
      custom_data['value'] = jobData.customData.value;
      custom_data['currency'] = jobData.customData.currency ?? 'BDT';
    }
    if (jobData.customData?.contentId) {
      custom_data['content_ids'] = [jobData.customData.contentId];
      custom_data['content_type'] = jobData.customData.contentType ?? 'product';
    }
    if (jobData.customData?.numItems !== undefined) {
      custom_data['num_items'] = jobData.customData.numItems;
    }
    if (jobData.customData?.orderId) {
      custom_data['order_id'] = jobData.customData.orderId;
    }

    // ── Assemble the full payload ─────────────────────────────────────────
    const payload = {
      data: [
        {
          event_name: jobData.eventName,
          event_time: Math.floor(new Date(jobData.eventTime).getTime() / 1000),
          event_id: jobData.trackingId, // Deduplication
          event_source_url: jobData.pageUrl,
          action_source: 'website',
          user_data,
          custom_data,
        },
      ],
      // test_event_code is only present in staging; omit in production
      ...(creds.testEventCode && { test_event_code: creds.testEventCode }),
    };

    // ── Native fetch — NO SDK ─────────────────────────────────────────────
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Facebook CAPI HTTP ${response.status}: ${body}`);
    }

    const result = await response.json() as { events_received?: number };
    this.logger.debug(
      `Facebook CAPI: events_received=${result.events_received ?? 0}`,
    );
  }
}
