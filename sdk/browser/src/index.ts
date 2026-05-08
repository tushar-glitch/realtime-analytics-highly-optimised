/**
 * Analytics tracking script — <2KB minified.
 * Usage: <script defer data-site-id="YOUR_SITE_ID" src="http://localhost:3000/tracker.min.js"></script>
 *
 * Attributes:
 *   data-site-id   required  UUID of the site to track
 *   data-collector optional  override collector origin (default: same origin as the script src)
 */

const script = document.currentScript as HTMLScriptElement | null
const SITE_ID = script?.dataset['siteId'] ?? ''

// Derive collector base URL from script src so self-hosted deploys work without config
const COLLECTOR = (() => {
  if (script?.dataset['collector']) return script.dataset['collector']!
  try { return new URL(script?.src ?? '').origin } catch { return '' }
})()

if (!SITE_ID) console.warn('[analytics] missing data-site-id')

interface Payload {
  site_id: string
  type: 'pageview' | 'custom'
  url: string
  referrer?: string
  event_name?: string
  props?: Record<string, string>
}

function send(payload: Payload) {
  if (!SITE_ID || !COLLECTOR) return
  const body = JSON.stringify(payload)
  // Beacon survives page unload; keepalive fetch as fallback
  if (navigator.sendBeacon) {
    navigator.sendBeacon(`${COLLECTOR}/collect`, new Blob([body], { type: 'application/json' }))
  } else {
    fetch(`${COLLECTOR}/collect`, {
      method: 'POST', body,
      headers: { 'content-type': 'application/json' },
      keepalive: true,
    }).catch(() => {})
  }
}

let lastUrl = ''

function trackPageview() {
  const url = location.href
  if (url === lastUrl) return   // dedupe — pushState/popstate can both fire
  lastUrl = url
  send({
    site_id: SITE_ID,
    type: 'pageview',
    url,
    referrer: document.referrer || undefined,
  })
}

// Public API
export function track(eventName: string, props?: Record<string, string>) {
  send({ site_id: SITE_ID, type: 'custom', url: location.href, event_name: eventName, props })
}

// SPA: intercept both pushState and replaceState; only fire when pathname+search changes
function patchHistory(method: 'pushState' | 'replaceState') {
  const orig = history[method].bind(history)
  history[method] = (...args: Parameters<typeof history.pushState>) => {
    orig(...args)
    trackPageview()
  }
}

patchHistory('pushState')
patchHistory('replaceState')
window.addEventListener('popstate', trackPageview)

// Hash-router support
window.addEventListener('hashchange', trackPageview)

// Initial pageview on load
trackPageview()

// Expose for manual calls
;(window as Window & { analytics?: { track: typeof track } }).analytics = { track }
