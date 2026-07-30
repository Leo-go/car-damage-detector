import type { HistoryItem } from '../types/detection'
import { getHistoryItem } from './history'

export interface HistoryShareParams {
  id?: string | null
  before?: string | null
  after?: string | null
}

/** Build a shareable history URL with optional before/after comparison. */
export function buildHistoryShareUrl(
  params: HistoryShareParams,
  origin = typeof window !== 'undefined' ? window.location.origin : '',
): string {
  const search = new URLSearchParams()
  if (params.id) search.set('id', params.id)
  if (params.before) search.set('before', params.before)
  if (params.after) search.set('after', params.after)
  const qs = search.toString()
  return `${origin}/history${qs ? `?${qs}` : ''}`
}

export function parseHistoryShareParams(
  searchParams: URLSearchParams,
): HistoryShareParams {
  return {
    id: searchParams.get('id'),
    before: searchParams.get('before'),
    after: searchParams.get('after'),
  }
}

/**
 * Resolve share targets from URL + localStorage.
 * Prefer explicit before/after query params; fall back to item.afterId.
 */
export function resolveShareComparison(params: HistoryShareParams): {
  beforeId: string
  afterId: string
  before?: HistoryItem
  after?: HistoryItem
  missing: string[]
} {
  const missing: string[] = []
  let beforeId = params.before ?? ''
  let afterId = params.after ?? ''

  if (params.id) {
    const item = getHistoryItem(params.id)
    if (!item) missing.push(params.id)
    if (!beforeId && item) beforeId = item.id
    if (!afterId && item?.afterId) afterId = item.afterId
  }

  const before = beforeId ? getHistoryItem(beforeId) : undefined
  const after = afterId ? getHistoryItem(afterId) : undefined
  if (beforeId && !before) missing.push(beforeId)
  if (afterId && !after) missing.push(afterId)

  return { beforeId, afterId, before, after, missing }
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}
