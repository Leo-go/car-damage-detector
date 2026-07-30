import { jsPDF } from 'jspdf'
import {
  DAMAGE_LABELS,
  SEVERITY_LABELS,
  type DetectResponse,
} from '../types/detection'

export async function downloadDamagePdf(
  result: DetectResponse,
  options: { filename?: string; imageDataUrl?: string } = {},
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 16
  let y = margin

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Car Damage Detector — Report', margin, y)
  y += 10

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(`File: ${options.filename ?? 'upload'}`, margin, y)
  y += 6
  doc.text(`Date: ${new Date().toLocaleString()}`, margin, y)
  y += 6
  doc.text(`Total damages: ${result.summary.total_damages}`, margin, y)
  y += 6
  doc.text(`Severity: ${SEVERITY_LABELS[result.summary.severity]} (${result.summary.severity})`, margin, y)
  y += 6
  doc.text(`Estimated repair: ${result.summary.estimated_repair_cost}`, margin, y)
  y += 10

  if (options.imageDataUrl) {
    try {
      const imgW = 178
      const imgH = 100
      doc.addImage(options.imageDataUrl, 'JPEG', margin, y, imgW, imgH)
      y += imgH + 8
    } catch {
      // skip image if encoding fails
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.text('Detections', margin, y)
  y += 7
  doc.setFont('helvetica', 'normal')

  if (result.detections.length === 0) {
    doc.text('No damage detected.', margin, y)
  } else {
    result.detections.forEach((det, i) => {
      if (y > 275) {
        doc.addPage()
        y = margin
      }
      const [x1, y1, x2, y2] = det.bbox
      const line = `${i + 1}. ${DAMAGE_LABELS[det.class]} — ${(det.confidence * 100).toFixed(1)}% — ${det.area_cm2} cm2 — bbox [${Math.round(x1)}, ${Math.round(y1)}, ${Math.round(x2)}, ${Math.round(y2)}]`
      const wrapped = doc.splitTextToSize(line, 178)
      doc.text(wrapped, margin, y)
      y += wrapped.length * 5 + 2
    })
  }

  y += 8
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(
    'Disclaimer: repair cost is approximate and not an official workshop quote.',
    margin,
    Math.min(y, 285),
  )

  const safeName = (options.filename ?? 'damage-report').replace(/\.[^.]+$/, '')
  doc.save(`${safeName}-report.pdf`)
}
