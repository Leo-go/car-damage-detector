import { useMemo, useRef, useState, useEffect } from 'react'
import {
  DAMAGE_COLORS,
  DAMAGE_LABELS,
  type Detection,
} from '../types/detection'

interface DamageViewerProps {
  imageUrl: string
  detections: Detection[]
  imageWidth: number
  imageHeight: number
  className?: string
}

export function DamageViewer({
  imageUrl,
  detections,
  imageWidth,
  imageHeight,
  className = '',
}: DamageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [layout, setLayout] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el || !imageWidth || !imageHeight) return

    const update = () => {
      const cw = el.clientWidth
      const ch = el.clientHeight
      const scale = Math.min(cw / imageWidth, ch / imageHeight)
      const width = imageWidth * scale
      const height = imageHeight * scale
      setLayout({
        width,
        height,
        offsetX: (cw - width) / 2,
        offsetY: (ch - height) / 2,
      })
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [imageWidth, imageHeight, imageUrl])

  const boxes = useMemo(() => {
    if (!layout.width || !imageWidth) return []
    const sx = layout.width / imageWidth
    const sy = layout.height / imageHeight
    return detections.map((det, index) => {
      const [x1, y1, x2, y2] = det.bbox
      return {
        index,
        det,
        left: layout.offsetX + x1 * sx,
        top: layout.offsetY + y1 * sy,
        width: Math.max(2, (x2 - x1) * sx),
        height: Math.max(2, (y2 - y1) * sy),
        color: DAMAGE_COLORS[det.class],
      }
    })
  }, [detections, imageWidth, imageHeight, layout])

  const selected = selectedIndex != null ? detections[selectedIndex] : null

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        ref={containerRef}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line bg-[#dbe3ea] sm:aspect-[16/10]"
      >
        <img
          src={imageUrl}
          alt="Результат детекции"
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />

        {boxes.map((box) => (
          <button
            key={box.index}
            type="button"
            className="absolute z-10 rounded-sm border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            style={{
              left: box.left,
              top: box.top,
              width: box.width,
              height: box.height,
              borderColor: box.color,
              backgroundColor:
                selectedIndex === box.index ? `${box.color}33` : `${box.color}14`,
              boxShadow: selectedIndex === box.index ? `0 0 0 2px ${box.color}` : undefined,
            }}
            onClick={() =>
              setSelectedIndex((prev) => (prev === box.index ? null : box.index))
            }
            aria-label={`${DAMAGE_LABELS[box.det.class]}, ${(box.det.confidence * 100).toFixed(0)}%`}
          />
        ))}

        {selected && selectedIndex != null && boxes[selectedIndex] && (
          <div
            className="absolute z-20 max-w-[220px] rounded-xl border border-line bg-white/95 p-3 text-left shadow-lg backdrop-blur"
            style={{
              left: Math.min(
                boxes[selectedIndex].left,
                (containerRef.current?.clientWidth ?? 300) - 230,
              ),
              top: Math.max(8, boxes[selectedIndex].top - 8),
              transform: boxes[selectedIndex].top > 72 ? 'translateY(-100%)' : undefined,
            }}
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: DAMAGE_COLORS[selected.class] }}
              />
              {DAMAGE_LABELS[selected.class]}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              Confidence: {(selected.confidence * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-ink-muted">Площадь: {selected.area_cm2} см²</p>
            <button
              type="button"
              className="mt-2 text-xs font-medium text-accent"
              onClick={() => setSelectedIndex(null)}
            >
              Закрыть
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-ink-muted">
        {(Object.keys(DAMAGE_COLORS) as Array<keyof typeof DAMAGE_COLORS>).map((key) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: DAMAGE_COLORS[key] }} />
            {DAMAGE_LABELS[key]}
          </span>
        ))}
      </div>
    </div>
  )
}
