/**
 * Geo-enrichment using Cloudflare's `cf` request properties — optimized.
 *
 * Added fields vs v1:
 *   - cfRegion    (state/province code, e.g. "BD-13" for Dhaka)
 *   - cfPostalCode (when Cloudflare can resolve it)
 *   - cfIsEuCountry (GDPR compliance flag)
 *
 * Reference: https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties
 */

import type { ValidPayload } from './validate';

export interface GeoEnrichedPayload extends ValidPayload {
  /** ISO 3166-1 alpha-2 country code, e.g. "BD" */
  cfCountry?: string;
  /** ISO 3166-2 region/state code, e.g. "BD-13" */
  cfRegion?: string;
  /** City name, e.g. "Dhaka" */
  cfCity?: string;
  /** Postal/ZIP code */
  cfPostalCode?: string;
  /** IANA timezone, e.g. "Asia/Dhaka" */
  cfTimezone?: string;
  /** Cloudflare PoP IATA code (nearest edge datacenter), e.g. "DAC" */
  cfColo?: string;
  /** Autonomous System Number of the client's network */
  cfAsn?: number;
  /** True if the client is in an EU country (for GDPR awareness) */
  cfIsEuCountry?: boolean;
  /** Real client IP (from CF-Connecting-IP header) */
  clientIp?: string;
}

/**
 * Merge Cloudflare geo metadata into the event payload.
 * Any field Cloudflare cannot resolve is omitted (undefined = not sent to origin).
 */
export function enrichWithGeo(
  payload: ValidPayload,
  cf: CfProperties | undefined,
  clientIp: string,
): GeoEnrichedPayload {
  return {
    ...payload,
    // Use authoritative CF-Connecting-IP rather than any client-supplied value
    clientIp: clientIp !== 'unknown' ? clientIp : payload.clientIp,
    // Geo fields
    cfCountry:     cf?.country     as string  | undefined,
    cfRegion:      cf?.region      as string  | undefined,
    cfCity:        cf?.city        as string  | undefined,
    cfPostalCode:  cf?.postalCode  as string  | undefined,
    cfTimezone:    cf?.timezone    as string  | undefined,
    cfColo:        cf?.colo        as string  | undefined,
    cfAsn:         cf?.asn         as number  | undefined,
    cfIsEuCountry: cf?.isEUCountry as boolean | undefined,
  };
}
