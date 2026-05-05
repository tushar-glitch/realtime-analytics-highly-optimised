import { createHash } from 'node:crypto'

/**
 * Cookieless visitor fingerprint — same approach as Plausible.
 * Hashes IP + UA + site_id + UTC date so the ID rotates daily.
 * Never stored as a cookie; GDPR-safe.
 */
export function makeVisitorId(ip: string, userAgent: string, siteId: string): string {
  const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  return createHash('sha256')
    .update(`${ip}::${userAgent}::${siteId}::${date}`)
    .digest('hex')
    .slice(0, 16) // 64-bit hex, enough entropy for a visitor fingerprint
}
