'use client'
import type { DeviceBreakdown, BrowserBreakdown } from '@analytics/types'

interface Props {
  devices: DeviceBreakdown
  browsers: BrowserBreakdown[]
}

const DEVICE_ICONS: Record<string, string> = {
  desktop: '🖥',
  mobile: '📱',
  tablet: '⬛',
}

export function Devices({ devices, browsers }: Props) {
  const totalDevices = (devices.desktop + devices.mobile + devices.tablet) || 1
  const maxBrowser = browsers[0]?.visitors ?? 1

  return (
    <div className="space-y-5">
      {/* Device type donut-style breakdown */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Devices</h3>
        <div className="space-y-1">
          {(['desktop', 'mobile', 'tablet'] as const).map((type) => {
            const count = devices[type]
            const pct = Math.round((count / totalDevices) * 100)
            return (
              <div key={type} className="relative flex items-center justify-between text-sm py-1.5">
                <div className="absolute inset-y-0 left-0 rounded bg-indigo-50" style={{ width: `${pct}%` }} />
                <span className="relative z-10 pl-2 flex items-center gap-2 text-gray-700">
                  <span>{DEVICE_ICONS[type]}</span>
                  <span className="capitalize">{type}</span>
                </span>
                <span className="relative z-10 pr-2 text-gray-500 tabular-nums">{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Browsers */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Browsers</h3>
        {browsers.length === 0 && <p className="text-sm text-gray-400">No data</p>}
        <ul className="space-y-1">
          {browsers.map((b) => (
            <li key={b.browser} className="relative flex items-center justify-between text-sm py-1.5">
              <div className="absolute inset-y-0 left-0 rounded bg-indigo-50" style={{ width: `${(b.visitors / maxBrowser) * 100}%` }} />
              <span className="relative z-10 pl-2 text-gray-700">{b.browser}</span>
              <span className="relative z-10 pr-2 text-gray-500 tabular-nums">{b.visitors.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
