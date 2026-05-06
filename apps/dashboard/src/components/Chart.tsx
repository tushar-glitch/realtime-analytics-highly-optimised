'use client'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { TimeseriesPoint } from '@analytics/types'

interface Props {
  data: TimeseriesPoint[]
  metric: 'visitors' | 'pageviews'
}

function fmt(bucket: string) {
  const d = new Date(bucket.replace(' ', 'T') + 'Z')
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function Chart({ data, metric }: Props) {
  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
        No data for this period
      </div>
    )
  }

  const points = data.map((p) => ({ ...p, label: fmt(p.bucket) }))

  return (
    <ResponsiveContainer width="100%" height={192}>
      <AreaChart data={points} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6, boxShadow: 'none' }}
          labelStyle={{ color: '#6b7280', marginBottom: 2 }}
        />
        <Area
          type="monotone"
          dataKey={metric}
          stroke="#4F46E5"
          strokeWidth={2}
          fill="url(#grad)"
          dot={false}
          activeDot={{ r: 4, fill: '#4F46E5' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
