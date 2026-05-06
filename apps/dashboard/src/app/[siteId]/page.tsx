'use client'
import React, { useState } from 'react'
import { StatCard } from '@/components/StatCard'
import { Chart } from '@/components/Chart'
import { TopPages } from '@/components/TopPages'
import { useStatsSummary, useTopPages, useTimeseries } from '@/hooks/useStats'

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

export default function DashboardPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = React.use(params)
  const [period, setPeriod] = useState<Period>('24h')
  const [metric, setMetric] = useState<Metric>('visitors')

  const { data: stats } = useStatsSummary(siteId, period)
  const { data: pages } = useTopPages(siteId, period)
  const { data: timeseries } = useTimeseries(siteId, period)

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-indigo-600 font-semibold text-sm">⬛ Analytics</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-600 font-medium truncate max-w-xs">{siteId}</span>
          </div>
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
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-4">
        {/* Stats cards */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-5 divide-x divide-gray-100">
            <StatCard
              label="Visitors"
              value={fmt(stats?.visitors)}
              selected={metric === 'visitors'}
              onClick={() => setMetric('visitors')}
            />
            <StatCard
              label="Pageviews"
              value={fmt(stats?.pageviews)}
              selected={metric === 'pageviews'}
              onClick={() => setMetric('pageviews')}
            />
            <StatCard label="Sessions" value={fmt(stats?.sessions)} />
            <StatCard label="Bounce Rate" value={fmtPct(stats?.bounce_rate)} />
            <StatCard label="Avg Duration" value={fmtDuration(stats?.avg_duration)} />
          </div>

          {/* Chart */}
          <div className="px-6 pt-4 pb-5 border-t border-gray-50">
            <Chart data={timeseries ?? []} metric={metric} />
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <TopPages data={pages ?? []} />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Sources</h3>
            <p className="text-sm text-gray-400">Coming soon</p>
          </div>
        </div>
      </main>
    </div>
  )
}
