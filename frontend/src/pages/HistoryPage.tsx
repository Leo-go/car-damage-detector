import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeftRight, Link2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DamageViewer } from '../components/DamageViewer'
import { DamageReport } from '../components/DamageReport'
import {
  clearHistory,
  deleteHistoryItem,
  getHistoryItem,
  listHistory,
  updateHistoryItem,
} from '../lib/history'
import { trackEvent } from '../lib/analytics'
import {
  buildHistoryShareUrl,
  copyText,
  parseHistoryShareParams,
  resolveShareComparison,
} from '../lib/share'
import { SEVERITY_LABELS, type HistoryItem } from '../types/detection'

export function HistoryPage() {
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState<HistoryItem[]>(() => listHistory())
  const [compareBefore, setCompareBefore] = useState('')
  const [compareAfter, setCompareAfter] = useState('')
  const hydratedFromUrl = useRef(false)

  const shareParams = useMemo(() => parseHistoryShareParams(params), [params])
  const selectedId = shareParams.id

  const refresh = () => setItems(listHistory())

  useEffect(() => {
    refresh()
  }, [])

  // Auto-load id / before / after from query params (and linked afterId)
  useEffect(() => {
    const resolved = resolveShareComparison(shareParams)
    if (resolved.beforeId) setCompareBefore(resolved.beforeId)
    if (resolved.afterId) setCompareAfter(resolved.afterId)

    if (hydratedFromUrl.current) return
    const hasShareQuery = Boolean(
      shareParams.id || shareParams.before || shareParams.after,
    )
    if (!hasShareQuery) return
    hydratedFromUrl.current = true

    if (resolved.missing.length) {
      toast.error(
        'Часть записей из ссылки не найдена в этом браузере (localStorage).',
      )
    } else if (resolved.before && resolved.after) {
      toast.success('Сравнение до/после загружено из ссылки')
    }
  }, [shareParams])

  const syncParams = (next: {
    id?: string | null
    before?: string | null
    after?: string | null
  }) => {
    const search = new URLSearchParams()
    const id = next.id === undefined ? selectedId : next.id
    const before = next.before === undefined ? compareBefore : next.before
    const after = next.after === undefined ? compareAfter : next.after
    if (id) search.set('id', id)
    if (before) search.set('before', before)
    if (after) search.set('after', after)
    setParams(search, { replace: true })
  }

  const selected = useMemo(
    () => (selectedId ? getHistoryItem(selectedId) : undefined),
    [selectedId, items],
  )

  const beforeItem = compareBefore ? getHistoryItem(compareBefore) : undefined
  const afterItem = compareAfter ? getHistoryItem(compareAfter) : undefined

  const openItem = (id: string) => {
    const item = getHistoryItem(id)
    const after = item?.afterId || compareAfter || ''
    setCompareBefore(id)
    if (after) setCompareAfter(after)
    syncParams({ id, before: id, after: after || null })
  }

  const handleDelete = (id: string) => {
    deleteHistoryItem(id)
    refresh()
    if (selectedId === id || compareBefore === id || compareAfter === id) {
      const nextId = selectedId === id ? null : selectedId
      const nextBefore = compareBefore === id ? '' : compareBefore
      const nextAfter = compareAfter === id ? '' : compareAfter
      setCompareBefore(nextBefore)
      setCompareAfter(nextAfter)
      syncParams({
        id: nextId,
        before: nextBefore || null,
        after: nextAfter || null,
      })
    }
    toast.success('Запись удалена')
  }

  const handleClear = () => {
    clearHistory()
    refresh()
    setCompareBefore('')
    setCompareAfter('')
    setParams({})
    toast.success('История очищена')
  }

  const linkAsAfter = () => {
    if (!selectedId || !compareAfter) {
      toast.error('Выберите «после» в блоке сравнения')
      return
    }
    updateHistoryItem(selectedId, { afterId: compareAfter })
    refresh()
    syncParams({ id: selectedId, before: compareBefore || selectedId, after: compareAfter })
    toast.success('Связь до/после сохранена')
  }

  const handleShareComparison = async () => {
    if (!compareBefore || !compareAfter) {
      toast.error('Выберите обе записи: до и после')
      return
    }
    const url = buildHistoryShareUrl({
      id: selectedId || compareBefore,
      before: compareBefore,
      after: compareAfter,
    })
    try {
      await copyText(url)
      trackEvent('compare_share')
      toast.success('Ссылка на сравнение скопирована')
    } catch {
      toast.error('Не удалось скопировать ссылку')
    }
  }

  const reportShareUrl = buildHistoryShareUrl({
    id: selectedId,
    before: compareBefore || selectedId,
    after: compareAfter || selected?.afterId || null,
  })

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight">История</h2>
          <p className="mt-2 text-ink-muted">
            Локальные проверки (localStorage). Ссылка вида{' '}
            <code className="text-xs">/history?before=…&amp;after=…</code> сразу открывает сравнение.
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-full border border-line bg-white px-3.5 py-2 text-sm font-medium text-alert hover:border-alert"
          >
            Очистить всё
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
          <p className="text-ink-muted">Пока нет сохранённых проверок.</p>
          <Link to="/" className="mt-3 inline-block text-sm font-semibold text-accent hover:underline">
            Перейти к детекции
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface-raised">
              {items.map((item) => {
                const active = item.id === selectedId
                return (
                  <li key={item.id}>
                    <div
                      className={[
                        'flex gap-3 p-3 transition',
                        active ? 'bg-accent-soft/40' : 'hover:bg-white/70',
                      ].join(' ')}
                    >
                      <button
                        type="button"
                        onClick={() => openItem(item.id)}
                        className="flex min-w-0 flex-1 gap-3 text-left"
                      >
                        <img
                          src={item.imageDataUrl}
                          alt=""
                          className="h-16 w-20 shrink-0 rounded-lg object-cover bg-[#dbe3ea]"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{item.filename}</p>
                          <p className="text-xs text-ink-muted">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                          <p className="mt-1 text-xs text-ink-muted">
                            {item.result.summary.total_damages} повр. ·{' '}
                            {SEVERITY_LABELS[item.result.summary.severity]}
                            {item.afterId ? ' · есть «после»' : ''}
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="self-start rounded-lg p-2 text-ink-muted hover:bg-alert/10 hover:text-alert"
                        aria-label="Удалить"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="rounded-2xl border border-line bg-surface-raised p-4">
              <div className="mb-3 flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-accent" />
                <h3 className="font-semibold">Сравнение до / после</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-ink-muted">
                  До
                  <select
                    className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"
                    value={compareBefore}
                    onChange={(e) => {
                      const value = e.target.value
                      setCompareBefore(value)
                      syncParams({ before: value || null })
                    }}
                  >
                    <option value="">Выберите…</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.filename} · {new Date(item.createdAt).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-medium text-ink-muted">
                  После
                  <select
                    className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"
                    value={compareAfter}
                    onChange={(e) => {
                      const value = e.target.value
                      setCompareAfter(value)
                      syncParams({ after: value || null })
                    }}
                  >
                    <option value="">Выберите…</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.filename} · {new Date(item.createdAt).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                {selectedId && (
                  <button
                    type="button"
                    onClick={linkAsAfter}
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    Привязать «после» к выбранной записи
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleShareComparison}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-accent"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Поделиться сравнением
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {beforeItem && afterItem ? (
              <div className="space-y-3">
                <h3 className="font-display text-xl font-semibold">До / после</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      До · {beforeItem.result.summary.total_damages} повр.
                    </p>
                    <DamageViewer
                      imageUrl={beforeItem.imageDataUrl}
                      detections={beforeItem.result.detections}
                      imageWidth={beforeItem.result.meta?.image_width ?? 800}
                      imageHeight={beforeItem.result.meta?.image_height ?? 600}
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      После · {afterItem.result.summary.total_damages} повр.
                    </p>
                    <DamageViewer
                      imageUrl={afterItem.imageDataUrl}
                      detections={afterItem.result.detections}
                      imageWidth={afterItem.result.meta?.image_width ?? 800}
                      imageHeight={afterItem.result.meta?.image_height ?? 600}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {selected ? (
              <div className="space-y-4">
                <DamageViewer
                  imageUrl={selected.imageDataUrl}
                  detections={selected.result.detections}
                  imageWidth={selected.result.meta?.image_width ?? 800}
                  imageHeight={selected.result.meta?.image_height ?? 600}
                />
                <DamageReport
                  result={selected.result}
                  filename={selected.filename}
                  imageDataUrl={selected.imageDataUrl}
                  shareUrl={reportShareUrl}
                />
              </div>
            ) : (
              !beforeItem && (
                <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center text-sm text-ink-muted">
                  Выберите запись слева или пару для сравнения
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
