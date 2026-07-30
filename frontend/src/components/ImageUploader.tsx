import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { ImagePlus, Upload, X } from 'lucide-react'
import { toast } from 'sonner'

const ACCEPTED = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
}
const MAX_SIZE_MB = 10

interface ImageUploaderProps {
  file: File | null
  previewUrl: string | null
  uploadProgress: number | null
  disabled?: boolean
  onFileSelect: (file: File) => void
  onClear: () => void
}

export function ImageUploader({
  file,
  previewUrl,
  uploadProgress,
  disabled = false,
  onFileSelect,
  onClear,
}: ImageUploaderProps) {
  const [localError, setLocalError] = useState<string | null>(null)

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length) {
        const code = rejected[0]?.errors[0]?.code
        const message =
          code === 'file-too-large'
            ? `Максимум ${MAX_SIZE_MB} MB`
            : code === 'file-invalid-type'
              ? 'Только JPG или PNG'
              : 'Не удалось загрузить файл'
        setLocalError(message)
        toast.error(message)
        return
      }
      if (accepted[0]) {
        setLocalError(null)
        onFileSelect(accepted[0])
      }
    },
    [onFileSelect],
  )

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: MAX_SIZE_MB * 1024 * 1024,
    multiple: false,
    disabled,
    noClick: Boolean(previewUrl),
    noKeyboard: Boolean(previewUrl),
  })

  useEffect(() => {
    if (!file) setLocalError(null)
  }, [file])

  const progressLabel = useMemo(() => {
    if (uploadProgress == null) return null
    return `${uploadProgress}%`
  }, [uploadProgress])

  if (previewUrl && file) {
    return (
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-[0_20px_50px_-28px_rgba(18,21,26,0.45)]">
          <img
            src={previewUrl}
            alt="Превью автомобиля"
            className="max-h-[min(52vh,480px)] w-full object-contain bg-[#dbe3ea]"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-ink/80 to-transparent px-4 pb-4 pt-10 text-white">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-white/70">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={onClear}
              disabled={disabled}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25 disabled:opacity-50"
              aria-label="Удалить изображение"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {uploadProgress != null && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-ink-muted">
              <span>Загрузка на сервер…</span>
              <span className="tabular-nums">{progressLabel}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-line/70">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={[
          'group flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border border-dashed px-6 py-14 text-center transition sm:py-16',
          'bg-surface-raised/80 backdrop-blur-sm',
          isDragActive
            ? 'scale-[1.01] border-accent bg-accent-soft/40'
            : 'border-line hover:border-accent/60 hover:bg-surface-raised',
          disabled ? 'pointer-events-none opacity-60' : '',
        ].join(' ')}
      >
        <input {...getInputProps()} />
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent transition group-hover:scale-105">
          {isDragActive ? <ImagePlus className="h-7 w-7" /> : <Upload className="h-7 w-7" />}
        </div>
        <div className="space-y-1">
          <p className="font-display text-xl font-semibold tracking-tight text-ink">
            {isDragActive ? 'Отпустите файл' : 'Загрузите фото автомобиля'}
          </p>
          <p className="text-sm text-ink-muted">
            Drag & drop или выберите файл · JPG, PNG · до {MAX_SIZE_MB} MB
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            open()
          }}
          disabled={disabled}
          className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-accent hover:text-accent"
        >
          Выбрать файл
        </button>
      </div>
      {localError && (
        <p className="text-sm font-medium text-alert" role="alert">
          {localError}
        </p>
      )}
    </div>
  )
}
