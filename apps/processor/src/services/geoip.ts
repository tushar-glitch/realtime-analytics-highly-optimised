import { Reader } from '@maxmind/geoip2-node'

let reader: Reader | null = null

export async function initGeoIP(dbPath: string) {
  reader = await Reader.open(dbPath)
}

export function lookupGeo(ip: string): { country: string; region: string } {
  if (!reader) return { country: '', region: '' }
  try {
    const result = reader.city(ip)
    return {
      country: result.country?.isoCode ?? '',
      region: result.subdivisions?.[0]?.isoCode ?? '',
    }
  } catch {
    return { country: '', region: '' }
  }
}
