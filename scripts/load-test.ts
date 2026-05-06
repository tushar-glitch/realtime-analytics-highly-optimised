/**
 * Fires N pageview events concurrently against the collector.
 * Usage: tsx scripts/load-test.ts [count] [concurrency]
 * Defaults: 1000 events, 50 concurrent
 */

const COLLECTOR = 'http://localhost:3000'
const SITE_ID   = '550e8400-e29b-41d4-a716-446655440000'
const TOTAL     = Number(process.argv[2] ?? 1000)
const CONCURRENCY = Number(process.argv[3] ?? 50)

const PAGES = ['/', '/about', '/pricing', '/blog', '/docs', '/contact', '/signup', '/login']
const REFERRERS = [
  '', 'https://google.com', 'https://twitter.com',
  'https://github.com', 'https://hn.algolia.com', '',
]
const UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 Safari/605.1.15',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124.0 Mobile',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

async function sendEvent(i: number): Promise<void> {
  const page = pick(PAGES)
  const body = JSON.stringify({
    site_id: SITE_ID,
    type: 'pageview',
    url: `https://example.com${page}?v=${i}`,
    referrer: pick(REFERRERS),
  })

  const res = await fetch(`${COLLECTOR}/collect`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': pick(UAS),
      'x-forwarded-for': `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    },
    body,
  })

  if (res.status !== 204) {
    const text = await res.text()
    throw new Error(`Event ${i} failed: ${res.status} ${text}`)
  }
}

async function run() {
  console.log(`Sending ${TOTAL} events (concurrency ${CONCURRENCY})…`)
  const start = Date.now()
  let sent = 0
  let errors = 0

  for (let offset = 0; offset < TOTAL; offset += CONCURRENCY) {
    const batch = Array.from(
      { length: Math.min(CONCURRENCY, TOTAL - offset) },
      (_, j) => sendEvent(offset + j).catch((e) => { errors++; console.error(e.message) }),
    )
    await Promise.all(batch)
    sent += batch.length
    process.stdout.write(`\r  sent ${sent}/${TOTAL}`)
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  const rps = (sent / Number(elapsed)).toFixed(0)
  console.log(`\nDone: ${sent - errors} ok, ${errors} errors in ${elapsed}s (${rps} req/s)`)
}

run().catch((e) => { console.error(e); process.exit(1) })
