import type { ClickHouseClient } from '@clickhouse/client'
import type { TopReferrer, Period } from '@analytics/types'

function periodToInterval(period: Period): string {
  const map: Record<Period, string> = {
    '1h': '1 HOUR',
    '24h': '24 HOUR',
    '7d': '7 DAY',
    '30d': '30 DAY',
  }
  return map[period]
}

export async function getTopReferrers(
  client: ClickHouseClient,
  siteId: string,
  period: Period,
  limit = 10,
): Promise<TopReferrer[]> {
  const interval = periodToInterval(period)

  return client
    .query({
      query: `
        SELECT
          ref_source,
          sum(pageviews)      AS pageviews,
          uniqMerge(visitors) AS visitors
        FROM mv_referrers_daily_data
        WHERE site_id = {site_id: UUID}
          AND date >= toDate(now() - INTERVAL ${interval})
        GROUP BY ref_source
        ORDER BY pageviews DESC
        LIMIT {limit: UInt32}
      `,
      query_params: { site_id: siteId, limit },
      format: 'JSONEachRow',
    })
    .then((r) => r.json<TopReferrer>())
    .then((rows) => rows.map((row) => ({ ...row, pageviews: Number(row.pageviews), visitors: Number(row.visitors) })))
}
