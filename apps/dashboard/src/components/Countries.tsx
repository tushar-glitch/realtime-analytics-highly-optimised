'use client'
import type { TopCountry } from '@analytics/types'

// ISO 3166-1 alpha-2 → flag emoji
function flag(code: string): string {
  if (!code || code.length !== 2) return '🌐'
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  )
}

interface Props { data: TopCountry[] }

export function Countries({ data }: Props) {
  const max = data[0]?.pageviews ?? 1

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Countries</h3>
      {data.length === 0 && <p className="text-sm text-gray-400">No data</p>}
      <ul className="space-y-1">
        {data.map((c) => (
          <li key={c.country} className="relative flex items-center justify-between text-sm py-1.5">
            <div className="absolute inset-y-0 left-0 rounded bg-indigo-50" style={{ width: `${(c.pageviews / max) * 100}%` }} />
            <span className="relative z-10 pl-2 flex items-center gap-2 text-gray-700">
              <span>{flag(c.country)}</span>
              <span>{c.country}</span>
            </span>
            <span className="relative z-10 pr-2 text-gray-500 tabular-nums">{c.pageviews.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
