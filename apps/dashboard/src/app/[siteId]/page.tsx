'use client'
import React, { useState } from 'react'
import { StatCard } from '@/components/StatCard'
import { Chart } from '@/components/Chart'
import { TopPages } from '@/components/TopPages'
import { Sources } from '@/components/Sources'
import { LiveBadge } from '@/components/LiveBadge'
import { useStatsSummary, useTopPages, useTimeseries, useTopReferrers } from '@/hooks/useStats'

type Period = '1h' | '24h' | '7d' | '30d'
type Metric = 'visitors' | 'pageviews'

const PERIODS: { label: string; value: Period }[] = [
  { label: '1h', value: '1h' },
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
]

function fmt(n: number | undefined): string {
  if (n === undefined) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k'
  return n.toLocaleString()
}

function fmtPct(n: number | undefined): string {
  if (n === undefined) return '—'
  return (n * 100).toFixed(1) + '%'
}

function fmtDuration(seconds: number | undefined): string {
  if (seconds === undefined) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded ${className}`} />
}

export default function DashboardPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = React.use(params)
  const [period, setPeriod] = useState<Period>('24h')
  const [metric, setMetric] = useState<Metric>('visitors')

  const { data: stats, isLoading: statsLoading } = useStatsSummary(siteId, period)
  const { data: pages } = useTopPages(siteId, period)
  const { data: timeseries } = useTimeseries(siteId, period)
  const { data: referrers } = useTopReferrers(siteId, period)

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-indigo-600 font-semibold text-sm shrink-0">⬛ Analytics</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-600 font-medium truncate">{siteId}</span>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <LiveBadge siteId={siteId} />
            {/* Period selector */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    period === p.value
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-4">
        {/* Stats + Chart card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-5 divide-x divide-gray-100">
            {statsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-4 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-7 w-20" />
                </div>
              ))
            ) : (
              <>
                <StatCard label="Visitors"     value={fmt(stats?.visitors)}             selected={metric === 'visitors'}  onClick={() => setMetric('visitors')} />
                <StatCard label="Pageviews"    value={fmt(stats?.pageviews)}            selected={metric === 'pageviews'} onClick={() => setMetric('pageviews')} />
                <StatCard label="Sessions"     value={fmt(stats?.sessions)} />
                <StatCard label="Bounce Rate"  value={fmtPct(stats?.bounce_rate)} />
                <StatCard label="Avg Duration" value={fmtDuration(stats?.avg_duration)} />
              </>
            )}
          </div>

          <div className="px-6 pt-4 pb-5 border-t border-gray-50">
            {timeseries ? (
              <Chart data={timeseries} metric={metric} />
            ) : (
              <Skeleton className="h-48 w-full" />
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            {pages ? <TopPages data={pages} /> : <Skeleton className="h-48 w-full" />}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            {referrers ? <Sources data={referrers} /> : <Skeleton className="h-48 w-full" />}
          </div>
        </div>
      </main>
    </div>
  )
}
