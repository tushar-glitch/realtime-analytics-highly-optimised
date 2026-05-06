import { createHash } from 'node:crypto'
import type { KafkaEvent, EnrichedEvent } from '@analytics/types'
import { lookupGeo } from './geoip.js'
import { parseUserAgent } from './useragent.js'

function parseUtm(url: string) {
  try {
    const u = new URL(url)
    return {
      utm_source: u.searchParams.get('utm_source') ?? '',
      utm_medium: u.searchParams.get('utm_medium') ?? '',
      utm_campaign: u.searchParams.get('utm_campaign') ?? '',
      utm_content: u.searchParams.get('utm_content') ?? '',
      utm_term: u.searchParams.get('utm_term') ?? '',
    }
  } catch {
    return { utm_source: '', utm_medium: '', utm_campaign: '', utm_content: '', utm_term: '' }
  }
}

function parseRefSource(referrer: string, utmSource: string): string {
  if (utmSource) return utmSource
  if (!referrer) return 'Direct'
  try {
    return new URL(referrer).hostname.replace(/^www\./, '')
  } catch {
    return 'Unknown'
  }
}

function makeSessionId(visitorId: string, siteId: string): string {
  const hash = createHash('sha256')
    .update(`${visitorId}::${siteId}::${new Date().toISOString().slice(0, 13)}`)
    .digest('hex')
    .slice(0, 16)
  return BigInt(`0x${hash}`).toString()
}

function hexToUInt64String(hex: string): string {
  return BigInt(`0x${hex.padEnd(16, '0')}`).toString()
}

export function enrich(raw: KafkaEvent): EnrichedEvent {
  const utm = parseUtm(raw.url)
  const geo = lookupGeo(raw.ip)
  const ua = parseUserAgent(raw.user_agent)

  let pathname = ''
  let hostname = ''
  try {
    const u = new URL(raw.url)
    pathname = u.pathname
    hostname = u.hostname
  } catch { /* malformed URL — leave empty */ }

  const ref_source = parseRefSource(raw.referrer ?? '', utm.utm_source)
  const visitor_id = hexToUInt64String(raw.visitor_id)
  const session_id = makeSessionId(raw.visitor_id, raw.site_id)

  return {
    site_id: raw.site_id,
    timestamp: new Date(raw.received_at).toISOString().replace('T', ' ').replace('Z', ''),
    type: raw.type,
    pathname,
    hostname,
    referrer: raw.referrer ?? '',
    ref_source,
    ...utm,
    ...ua,
    ...geo,
    session_id,
    visitor_id,
    is_bounce: 1, // updated to 0 on subsequent pageviews in same session
    duration: 0,
    event_name: raw.event_name ?? '',
    props: raw.props ?? {},
  }
}
