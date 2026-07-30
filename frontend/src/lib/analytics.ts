import { createElement, Fragment, type ReactElement } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'

const enabled = import.meta.env.VITE_ANALYTICS_ENABLED !== 'false'

/** Vercel Analytics + Speed Insights (no-op вне Vercel). */
export function AnalyticsProvider(): ReactElement | null {
  if (!enabled) return null
  return createElement(
    Fragment,
    null,
    createElement(Analytics),
    createElement(SpeedInsights),
  )
}

export type AnalyticsEvent =
  | 'detect_start'
  | 'detect_success'
  | 'detect_error'
  | 'pdf_download'
  | 'share_click'
  | 'history_open'
  | 'compare_share'

/** Custom events — на Vercel Analytics; локально console в DEV. */
export function trackEvent(
  name: AnalyticsEvent,
  props?: Record<string, string | number | boolean>,
): void {
  if (!enabled) return

  if (import.meta.env.DEV) {
    console.debug('[analytics]', name, props ?? {})
  }

  void import('@vercel/analytics')
    .then(({ track }) => {
      track(name, props)
    })
    .catch(() => {
      // ignore
    })
}
