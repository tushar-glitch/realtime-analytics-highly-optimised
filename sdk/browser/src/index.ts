/**
 * Analytics tracking script — <2KB minified.
 * Usage: <script defer data-site-id="YOUR_SITE_ID" src="/tracker.min.js"></script>
 */

const script = document.currentScript as HTMLScriptElement | null
const SITE_ID = script?.dataset['siteId'] ?? ''
const COLLECTOR = script?.dataset['collector'] ?? 'https://collect.yourdomain.com'

if (!SITE_ID) {
  console.error('[analytics] data-site-id is required')
}

interface EventPayload {
  site_id: string
  type: 'pageview' | 'custom'
  url: string
  referrer?: string
  event_name?: string
  props?: Record<string, string>
}

function send(payload: EventPayload) {
  const body = JSON.stringify(payload)

  // Beacon API — survives page unload (important for exit tracking)
  if (navigator.sendBeacon) {
    navigator.sendBeacon(`${COLLECTOR}/collect`, new Blob([body], { type: 'application/json' }))
    return
  }

  // Fallback: fetch with keepalive
  fetch(`${COLLECTOR}/collect`, {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json' },
    keepalive: true,
  }).catch(() => {/* swallow — analytics must never break the host page */})
}

function trackPageview() {
  if (!SITE_ID) return
  send({
    site_id: SITE_ID,
    type: 'pageview',
    url: window.location.href,
    referrer: document.referrer || undefined,
  })
}

// Public API — window.analytics.track('event', { prop: 'value' })
export function track(eventName: string, props?: Record<string, string>) {
  if (!SITE_ID) return
  send({
    site_id: SITE_ID,
    type: 'custom',
    url: window.location.href,
    event_name: eventName,
    props,
  })
}

// Initial pageview
trackPageview()

// SPA support — intercept pushState / replaceState for client-side navigation
const _push = history.pushState.bind(history)
history.pushState = (...args) => {
  _push(...args)
  trackPageview()
}

window.addEventListener('popstate', trackPageview)

// Expose on window for manual tracking
;(window as Window & { analytics?: { track: typeof track } }).analytics = { track }
