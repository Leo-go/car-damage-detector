export type DamageClass = 'scratch' | 'dent' | 'broken'
export type Severity = 'low' | 'medium' | 'high'

/** Bounding box in image pixel coordinates: [x1, y1, x2, y2] */
export type BBox = [number, number, number, number]

export interface Detection {
  class: DamageClass
  confidence: number
  bbox: BBox
  area_cm2: number
}

export interface DetectionSummary {
  total_damages: number
  severity: Severity
  estimated_repair_cost: string
}

export interface DetectMeta {
  backend?: string
  image_width?: number
  image_height?: number
}

export interface DetectResponse {
  detections: Detection[]
  summary: DetectionSummary
  meta?: DetectMeta
}

export interface ReportRequest {
  detections: Detection[]
  summary: DetectionSummary
  filename?: string
  language?: 'ru' | 'en'
}

export interface ReportResponse {
  report: string
  format: 'text'
}

export interface HealthResponse {
  status: string
  service?: string
  active_backend?: string
  yolo_ready?: boolean
  opencv_ready?: boolean
  [key: string]: unknown
}

/** Saved inspection in localStorage history */
export interface HistoryItem {
  id: string
  createdAt: string
  filename: string
  /** data URL thumbnail / full preview for offline history */
  imageDataUrl: string
  result: DetectResponse
  /** Optional linked "after repair" inspection id for comparison */
  afterId?: string | null
  label?: string
}

export interface UploadProgress {
  loaded: number
  total: number
  percent: number
}

export const DAMAGE_LABELS: Record<DamageClass, string> = {
  scratch: 'Царапина',
  dent: 'Вмятина',
  broken: 'Разбитый элемент',
}

export const DAMAGE_COLORS: Record<DamageClass, string> = {
  scratch: '#eab308',
  dent: '#f97316',
  broken: '#ef4444',
}

export const SEVERITY_LABELS: Record<Severity, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
}
