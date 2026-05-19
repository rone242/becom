import { createHash } from 'crypto';

/**
 * SHA-256 hash a PII string (email, phone number, etc.) for compliant
 * delivery to Meta Conversions API and TikTok Events API.
 *
 * Both platforms require:
 *  - Lowercase before hashing
 *  - Trimmed whitespace
 *  - No country code prefix for phone (Meta normalizes to E.164)
 *
 * Reference:
 *  - Meta:   https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
 *  - TikTok: https://business-api.tiktok.com/portal/docs?id=1771101303285761
 */
export function hashPii(value: string): string {
  return createHash('sha256')
    .update(value.trim().toLowerCase())
    .digest('hex');
}

/**
 * Hash an object's PII fields in-place (returns a new object).
 * Only hashes fields that are non-empty strings.
 */
export function hashPiiFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
): T {
  const result = { ...obj };
  for (const field of fields) {
    const val = result[field];
    if (typeof val === 'string' && val.trim()) {
      (result as Record<string, unknown>)[field as string] = hashPii(val);
    }
  }
  return result;
}

/**
 * Normalize a phone number to digits only, then hash.
 * Removes +, -, spaces, parentheses.
 */
export function hashPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return hashPii(digits);
}
