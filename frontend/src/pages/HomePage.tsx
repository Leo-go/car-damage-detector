import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, ScanSearch } from 'lucide-react'
import { toast } from 'sonner'
import { detectDamage, getErrorMessage, healthCheck } from '../api/client'
import { ImageUploader } from '../components/ImageUploader'
import { DamageViewer } from '../components/DamageViewer'
import { DamageReport } from '../components/DamageReport'
import { AnalysisSkeleton } from '../components/Skeleton'
import { createId, fileToDataUrl, saveHistoryItem } from '../lib/history'
import { buildHistoryShareUrl } from '../lib/share'
import type { DetectResponse } from '../types/detection'

export function HomePage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [result, setResult] = useState<DetectResponse | null>(null)
  const [historyId, setHistoryId] = useState<string | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    let cancelled = false
    healthCheck()
      .then(() => {
        if (!cancelled) setApiOnline(true)
      })
      .catch(() => {
        if (!cancelled) setApiOnline(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleFileSelect = async (next: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    const url = URL.createObjectURL(next)
    setFile(next)
    setPreviewUrl(url)
    setResult(null)
    setHistoryId(null)
    setUploadProgress(null)

    const img = new Image()
    img.onload = () => setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
    img.src = url

    try {
      const dataUrl = await fileToDataUrl(next)
      setImageDataUrl(dataUrl)
    } catch {
      setImageDataUrl(null)
    }
  }

  const handleClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setImageDataUrl(null)
    setResult(null)
    setHistoryId(null)
    setUploadProgress(null)
    setNaturalSize({ width: 0, height: 0 })
  }

  const handleDetect = async () => {
    if (!file) return
    setIsDetecting(true)
    setUploadProgress(0)
    setResult(null)

    try {
      const data = await detectDamage(file, (p) => setUploadProgress(p.percent))
      setUploadProgress(100)
      setResult(data)

      if (data.meta?.image_width && data.meta?.image_height) {
        setNaturalSize({
          width: data.meta.image_width,
          height: data.meta.image_height,
        })
      }

      const id = createId()
      const dataUrl = imageDataUrl ?? (await fileToDataUrl(file))
      saveHistoryItem({
        id,
        createdAt: new Date().toISOString(),
        filename: file.name,
        imageDataUrl: dataUrl,
        result: data,
      })
      setHistoryId(id)
      toast.success(
        data.summary.total_damages
          ? `Найдено повреждений: ${data.summary.total_damages}`
          : 'Повреждений не обнаружено',
      )
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsDetecting(false)
      setTimeout(() => setUploadProgress(null), 400)
    }
  }

  const shareUrl = historyId
    ? buildHistoryShareUrl({ id: historyId, before: historyId })
    : undefined

  const displayWidth = naturalSize.width || result?.meta?.image_width || 0
  const displayHeight = naturalSize.height || result?.meta?.image_height || 0

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Проверка повреждений
          </h2>
          <p className="mt-2 text-ink-muted">
            Загрузите фото — получите bbox, оценку ущерба и PDF-отчёт.
          </p>
        </div>
        <p
          className={[
            'rounded-full px-3 py-1 text-xs font-semibold',
            apiOnline === null && 'bg-line/50 text-ink-muted',
            apiOnline === true && 'bg-ok/10 text-ok',
            apiOnline === false && 'bg-alert/10 text-alert',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {apiOnline === null ? 'API…' : apiOnline ? 'API online' : 'API offline'}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <ImageUploader
            file={file}
            previewUrl={previewUrl}
            uploadProgress={uploadProgress}
            disabled={isDetecting}
            onFileSelect={handleFileSelect}
            onClear={handleClear}
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDetect}
              disabled={!file || isDetecting}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDetecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ScanSearch className="h-4 w-4" />
              )}
              {isDetecting ? 'Анализ…' : 'Запустить детекцию'}
            </button>
            {historyId && (
              <Link to={`/history?id=${historyId}`} className="text-sm font-medium text-accent hover:underline">
                Открыть в истории
              </Link>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          {isDetecting && <AnalysisSkeleton />}

          {!isDetecting && result && previewUrl && (
            <>
              <DamageViewer
                imageUrl={previewUrl}
                detections={result.detections}
                imageWidth={displayWidth}
                imageHeight={displayHeight}
              />
              <DamageReport
                result={result}
                filename={file?.name}
                imageDataUrl={imageDataUrl ?? undefined}
                shareUrl={shareUrl}
              />
            </>
          )}

          {!isDetecting && !result && (
            <div className="rounded-2xl border border-line bg-surface-raised/70 p-6">
              <h3 className="font-display text-xl font-semibold">Что ищем</h3>
              <ul className="mt-4 space-y-3 text-sm text-ink-muted">
                <li className="flex gap-2">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-[#eab308]" />
                  Царапины — жёлтый
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-[#f97316]" />
                  Вмятины — оранжевый
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-[#ef4444]" />
                  Разбитые элементы — красный
                </li>
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
