/**
 * API Key verification using `crypto.subtle.timingSafeEqual`.
 *
 * Uses constant-time comparison to prevent timing-based key enumeration attacks.
 * The `x-internal-key` header must exactly match the INTERNAL_API_KEY secret.
 */

/**
 * Returns true if the request carries a valid x-internal-key header.
 * Uses constant-time comparison via SubtleCrypto to mitigate timing attacks.
 */
export async function verifyApiKey(request: Request, validKey: string): Promise<boolean> {
  const provided = request.headers.get('x-internal-key');
  if (!provided || !validKey) return false;

  // Encode both to Uint8Array for SubtleCrypto
  const encoder = new TextEncoder();
  const a = encoder.encode(provided.padEnd(validKey.length, '\0'));
  const b = encoder.encode(validKey.padEnd(provided.length, '\0'));

  // If lengths differ after padding, keys are definitely different —
  // but we still do the comparison to avoid early-exit timing leaks.
  const equal = await timingSafeEqual(a, b);
  return equal && provided.length === validKey.length;
}

/**
 * Constant-time byte comparison using HMAC-SHA256 as a side-channel-safe
 * equality check. Available in all Workers runtimes.
 */
async function timingSafeEqual(a: Uint8Array, b: Uint8Array): Promise<boolean> {
  const key = await crypto.subtle.generateKey(
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );

  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign('HMAC', key, a),
    crypto.subtle.sign('HMAC', key, b),
  ]);

  // Compare signatures byte-by-byte with XOR to avoid short-circuit
  const viewA = new Uint8Array(sigA);
  const viewB = new Uint8Array(sigB);

  let diff = 0;
  for (let i = 0; i < viewA.length; i++) {
    diff |= viewA[i] ^ viewB[i];
  }
  return diff === 0;
}
