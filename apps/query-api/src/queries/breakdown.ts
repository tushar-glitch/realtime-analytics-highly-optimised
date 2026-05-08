import type { ClickHouseClient } from '@clickhouse/client'
import type { TopCountry, DeviceBreakdown, BrowserBreakdown, Period } from '@analytics/types'

function periodToInterval(period: Period): string {
  const map: Record<Period, string> = {
    '1h': '1 HOUR', '24h': '24 HOUR', '7d': '7 DAY', '30d': '30 DAY',
  }
  return map[period]
}

export async function getTopCountries(
  client: ClickHouseClient,
  siteId: string,
  period: Period,
  limit = 10,
): Promise<TopCountry[]> {
  const interval = periodToInterval(period)
  return client
    .query({
      query: `
        SELECT
          country,
          sum(pageviews)      AS pageviews,
          uniqMerge(visitors) AS visitors
        FROM mv_pageviews_hourly_data
        WHERE site_id = {site_id: UUID}
          AND hour >= now() - INTERVAL ${interval}
          AND country != ''
        GROUP BY country
        ORDER BY pageviews DESC
        LIMIT {limit: UInt32}
      `,
      query_params: { site_id: siteId, limit },
      format: 'JSONEachRow',
    })
    .then((r) => r.json<TopCountry>())
    .then((rows) => rows.map((r) => ({ ...r, pageviews: Number(r.pageviews), visitors: Number(r.visitors) })))
}

export async function getDeviceBreakdown(
  client: ClickHouseClient,
  siteId: string,
  period: Period,
): Promise<DeviceBreakdown> {
  const interval = periodToInterval(period)
  return client
    .query({
      query: `
        SELECT
          device_type,
          sum(pageviews) AS pageviews
        FROM mv_pageviews_hourly_data
        WHERE site_id = {site_id: UUID}
          AND hour >= now() - INTERVAL ${interval}
        GROUP BY device_type
      `,
      query_params: { site_id: siteId },
      format: 'JSONEachRow',
    })
    .then((r) => r.json<{ device_type: string; pageviews: number }>())
    .then((rows) => {
      const out: DeviceBreakdown = { desktop: 0, mobile: 0, tablet: 0 }
      for (const row of rows) {
        const key = row.device_type as keyof DeviceBreakdown
        if (key in out) out[key] = Number(row.pageviews)
      }
      return out
    })
}

export async function getTopBrowsers(
  client: ClickHouseClient,
  siteId: string,
  period: Period,
  limit = 6,
): Promise<BrowserBreakdown[]> {
  const interval = periodToInterval(period)
  return client
    .query({
      query: `
        SELECT
          browser,
          sum(pageviews) AS visitors
        FROM mv_pageviews_hourly_data
        WHERE site_id = {site_id: UUID}
          AND hour >= now() - INTERVAL ${interval}
          AND browser != ''
        GROUP BY browser
        ORDER BY visitors DESC
        LIMIT {limit: UInt32}
      `,
      query_params: { site_id: siteId, limit },
      format: 'JSONEachRow',
    })
    .then((r) => r.json<BrowserBreakdown>())
    .then((rows) => rows.map((r) => ({ ...r, visitors: Number(r.visitors) })))
}
