'use client'
import type { TopReferrer } from '@analytics/types'

interface Props {
  data: TopReferrer[]
}

export function Sources({ data }: Props) {
  const max = data[0]?.pageviews ?? 1

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Sources</h3>
      {data.length === 0 && <p className="text-sm text-gray-400">No data</p>}
      <ul className="space-y-1">
        {data.map((ref) => (
          <li key={ref.ref_source} className="relative flex items-center justify-between text-sm py-1.5">
            <div
              className="absolute inset-y-0 left-0 rounded bg-indigo-50"
              style={{ width: `${(ref.pageviews / max) * 100}%` }}
            />
            <span className="relative z-10 pl-2 text-gray-700 truncate max-w-[60%]">
              {ref.ref_source || 'Direct / None'}
            </span>
            <span className="relative z-10 pr-2 text-gray-500 tabular-nums">{ref.pageviews.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
