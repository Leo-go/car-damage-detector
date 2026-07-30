import { useState } from 'react'
import { Download, Link2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { downloadDamagePdf } from '../lib/pdf'
import { copyText } from '../lib/share'
import {
  DAMAGE_COLORS,
  DAMAGE_LABELS,
  SEVERITY_LABELS,
  type DetectResponse,
  type Severity,
} from '../types/detection'

interface DamageReportProps {
  result: DetectResponse
  filename?: string
  imageDataUrl?: string
  /** Full URL including history query params (id/before/after) */
  shareUrl?: string
}

const severityStyles: Record<Severity, string> = {
  low: 'bg-ok/10 text-ok border-ok/20',
  medium: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  high: 'bg-alert/10 text-alert border-alert/20',
}

export function DamageReport({
  result,
  filename,
  imageDataUrl,
  shareUrl,
}: DamageReportProps) {
  const [pdfLoading, setPdfLoading] = useState(false)

  const handlePdf = async () => {
    setPdfLoading(true)
    try {
      await downloadDamagePdf(result, { filename, imageDataUrl })
      toast.success('PDF сохранён')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось создать PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  const handleShare = async () => {
    const url = shareUrl || window.location.href
    try {
      await copyText(url)
      toast.success('Ссылка скопирована — откроет запись и сравнение до/после')
    } catch {
      toast.error('Не удалось скопировать ссылку')
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Отчёт</h2>
          <p className="text-sm text-ink-muted">
            {result.summary.total_damages === 0
              ? 'Повреждений не найдено'
              : `Найдено: ${result.summary.total_damages}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handlePdf}
            disabled={pdfLoading}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-50"
          >
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Скачать отчёт PDF
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-medium transition hover:border-accent hover:text-accent"
          >
            <Link2 className="h-4 w-4" />
            Поделиться
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className={`rounded-2xl border px-4 py-3 ${severityStyles[result.summary.severity]}`}>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Оценка ущерба</p>
          <p className="mt-1 font-display text-xl font-semibold">
            {SEVERITY_LABELS[result.summary.severity]}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface-raised px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Примерная стоимость
          </p>
          <p className="mt-1 font-display text-xl font-semibold text-ink">
            {result.summary.estimated_repair_cost}
          </p>
        </div>
      </div>

      {result.detections.length > 0 ? (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface-raised">
          {result.detections.map((det, index) => {
            const [x1, y1, x2, y2] = det.bbox
            return (
              <li key={`${det.class}-${index}`} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: DAMAGE_COLORS[det.class] }}
                  />
                  <div>
                    <p className="font-medium">{DAMAGE_LABELS[det.class]}</p>
                    <p className="text-xs text-ink-muted">
                      {Math.round(x2 - x1)}×{Math.round(y2 - y1)} px · {det.area_cm2} см²
                    </p>
                  </div>
                </div>
                <p className="text-sm font-semibold tabular-nums">
                  {(det.confidence * 100).toFixed(1)}%
                </p>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
          Список повреждений пуст
        </div>
      )}
    </section>
  )
}
