'use client'
import useSWR from 'swr'
import type { StatsSummary, TopPage, TimeseriesPoint, TopReferrer, TopCountry, DeviceBreakdown, BrowserBreakdown } from '@analytics/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const BASE = '/api'

export function useStatsSummary(siteId: string, period: string) {
  return useSWR<StatsSummary>(
    `${BASE}/stats?site_id=${siteId}&period=${period}`,
    fetcher,
    { refreshInterval: 30_000 },
  )
}

export function useTopPages(siteId: string, period: string) {
  return useSWR<TopPage[]>(
    `${BASE}/pages?site_id=${siteId}&period=${period}`,
    fetcher,
    { refreshInterval: 30_000 },
  )
}

export function useTimeseries(siteId: string, period: string) {
  return useSWR<TimeseriesPoint[]>(
    `${BASE}/timeseries?site_id=${siteId}&period=${period}`,
    fetcher,
    { refreshInterval: 30_000 },
  )
}

export function useTopReferrers(siteId: string, period: string) {
  return useSWR<TopReferrer[]>(
    `${BASE}/referrers?site_id=${siteId}&period=${period}`,
    fetcher,
    { refreshInterval: 30_000 },
  )
}

export function useTopCountries(siteId: string, period: string) {
  return useSWR<TopCountry[]>(
    `${BASE}/countries?site_id=${siteId}&period=${period}`,
    fetcher,
    { refreshInterval: 30_000 },
  )
}

export function useDevices(siteId: string, period: string) {
  return useSWR<DeviceBreakdown>(
    `${BASE}/devices?site_id=${siteId}&period=${period}`,
    fetcher,
    { refreshInterval: 30_000 },
  )
}

export function useTopBrowsers(siteId: string, period: string) {
  return useSWR<BrowserBreakdown[]>(
    `${BASE}/browsers?site_id=${siteId}&period=${period}`,
    fetcher,
    { refreshInterval: 30_000 },
  )
}
