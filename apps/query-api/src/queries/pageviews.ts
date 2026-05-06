import type { ClickHouseClient } from '@clickhouse/client'
import type { StatsSummary, TopPage, TimeseriesPoint, Period } from '@analytics/types'

function periodToInterval(period: Period): string {
  const map: Record<Period, string> = {
    '1h': '1 HOUR',
    '24h': '24 HOUR',
    '7d': '7 DAY',
    '30d': '30 DAY',
  }
  return map[period]
}

function periodToBucket(period: Period): string {
  // Bucket size: 1h period → 5min buckets, others → 1h buckets
  return period === '1h' ? 'toStartOfFiveMinutes(hour)' : 'toStartOfHour(hour)'
}

export async function getStatsSummary(
  client: ClickHouseClient,
  siteId: string,
  period: Period,
): Promise<StatsSummary> {
  const interval = periodToInterval(period)
  const params = { site_id: siteId }

  // Two queries: sessions MV has bounce/duration, pageviews MV has pageview count
  const [sessionRows, pageviewRows] = await Promise.all([
    client
      .query({
        query: `
          SELECT
            visitors,
            s AS sessions,
            ifNull(b / nullIf(s, 0), 0) AS bounce_rate,
            ifNull(d / nullIf(s, 0), 0) AS avg_duration
          FROM (
            SELECT
              uniqMerge(visitors) AS visitors,
              sum(sessions)       AS s,
              sum(bounces)        AS b,
              sum(total_duration) AS d
            FROM mv_sessions_daily_data
            WHERE site_id = {site_id: UUID}
              AND date >= toDate(now() - INTERVAL ${interval})
          )
        `,
        query_params: params,
        format: 'JSONEachRow',
      })
      .then((r) => r.json<{ visitors: number; sessions: number; bounce_rate: number; avg_duration: number }>()),

    client
      .query({
        query: `
          SELECT sum(pageviews) AS pageviews
          FROM mv_pageviews_hourly_data
          WHERE site_id = {site_id: UUID}
            AND hour >= now() - INTERVAL ${interval}
        `,
        query_params: params,
        format: 'JSONEachRow',
      })
      .then((r) => r.json<{ pageviews: number }>()),
  ])

  const s = sessionRows[0] ?? { visitors: 0, sessions: 0, bounce_rate: 0, avg_duration: 0 }
  const p = pageviewRows[0] ?? { pageviews: 0 }

  return {
    visitors: Number(s.visitors),
    pageviews: Number(p.pageviews),
    sessions: Number(s.sessions),
    bounce_rate: Number(s.bounce_rate),
    avg_duration: Number(s.avg_duration),
    change: { visitors: 0, pageviews: 0 },
  }
}

export async function getTopPages(
  client: ClickHouseClient,
  siteId: string,
  period: Period,
  limit = 10,
): Promise<TopPage[]> {
  const interval = periodToInterval(period)

  return client
    .query({
      query: `
        SELECT
          pathname,
          sum(pageviews)            AS pageviews,
          uniqMerge(visitors)       AS visitors
        FROM mv_pageviews_hourly_data
        WHERE site_id = {site_id: UUID}
          AND hour >= now() - INTERVAL ${interval}
        GROUP BY pathname
        ORDER BY pageviews DESC
        LIMIT {limit: UInt32}
      `,
      query_params: { site_id: siteId, limit },
      format: 'JSONEachRow',
    })
    .then((r) => r.json<TopPage>())
    .then((rows) => rows.map((row) => ({ ...row, pageviews: Number(row.pageviews), visitors: Number(row.visitors) })))
}

export async function getTimeseries(
  client: ClickHouseClient,
  siteId: string,
  period: Period,
): Promise<TimeseriesPoint[]> {
  const interval = periodToInterval(period)
  const bucket = periodToBucket(period)

  return client
    .query({
      query: `
        SELECT
          toString(${bucket})   AS bucket,
          sum(pageviews)        AS pageviews,
          uniqMerge(visitors)   AS visitors
        FROM mv_pageviews_hourly_data
        WHERE site_id = {site_id: UUID}
          AND hour >= now() - INTERVAL ${interval}
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
      query_params: { site_id: siteId },
      format: 'JSONEachRow',
    })
    .then((r) => r.json<TimeseriesPoint>())
    .then((rows) => rows.map((row) => ({ ...row, pageviews: Number(row.pageviews), visitors: Number(row.visitors) })))
}
