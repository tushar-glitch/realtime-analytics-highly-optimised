import { UAParser } from 'ua-parser-js'
import type { DeviceType } from '@analytics/types'

interface ParsedUA {
  browser: string
  browser_ver: string
  os: string
  os_ver: string
  device_type: DeviceType
}

export function parseUserAgent(ua: string): ParsedUA {
  const p = new UAParser(ua).getResult()

  let device_type: DeviceType = 'desktop'
  if (p.device.type === 'mobile') device_type = 'mobile'
  else if (p.device.type === 'tablet') device_type = 'tablet'

  return {
    browser: p.browser.name ?? 'Unknown',
    browser_ver: p.browser.version ?? '',
    os: p.os.name ?? 'Unknown',
    os_ver: p.os.version ?? '',
    device_type,
  }
}
