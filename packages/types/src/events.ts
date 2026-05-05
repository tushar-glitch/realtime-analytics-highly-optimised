export type EventType = 'pageview' | 'custom'
export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown'

/** Payload received from the browser SDK over HTTP */
export interface RawEvent {
  site_id: string
  type: EventType
  url: string
  referrer?: string
  event_name?: string
  props?: Record<string, string>
  // injected by collector — not from client
  ip: string
  user_agent: string
  received_at: number
}

/** Shape published to Redpanda topic events.raw */
export interface KafkaEvent extends RawEvent {
  // stable visitor fingerprint (daily-rotating, cookieless)
  visitor_id: string
}

/** Final shape written to ClickHouse after processor enrichment */
export interface EnrichedEvent {
  site_id: string
  timestamp: Date
  type: EventType
  // Page
  pathname: string
  hostname: string
  // Referrer
  referrer: string
  ref_source: string
  // UTM (parsed from url query params)
  utm_source: string
  utm_medium: string
  utm_campaign: string
  // Device — from UA parsing
  browser: string
  os: string
  device_type: DeviceType
  // Geo — from MaxMind GeoLite2
  country: string
  region: string
  // Session
  session_id: bigint
  visitor_id: bigint
  is_bounce: 0 | 1
  duration: number
  // Custom events
  event_name: string
  props: Record<string, string>
}
