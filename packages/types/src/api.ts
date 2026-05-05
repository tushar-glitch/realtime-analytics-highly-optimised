export type Period = '1h' | '24h' | '7d' | '30d'

export interface DashboardQuery {
  site_id: string
  period: Period
}

export interface StatsSummary {
  visitors: number
  pageviews: number
  sessions: number
  bounce_rate: number
  avg_duration: number
  // % change vs previous period
  change: {
    visitors: number
    pageviews: number
  }
}

export interface TopPage {
  pathname: string
  visitors: number
  pageviews: number
  bounce_rate: number
}

export interface TopReferrer {
  ref_source: string
  visitors: number
  pageviews: number
}

export interface TopCountry {
  country: string
  visitors: number
  pageviews: number
}

export interface DeviceBreakdown {
  desktop: number
  mobile: number
  tablet: number
}

export interface BrowserBreakdown {
  browser: string
  visitors: number
}

export interface RealtimeStats {
  active_visitors: number
  pageviews_last_5m: number
  top_pages: Array<{ pathname: string; visitors: number }>
}

export interface TimeseriesPoint {
  bucket: string
  visitors: number
  pageviews: number
}
