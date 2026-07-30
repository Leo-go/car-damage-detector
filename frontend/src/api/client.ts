import axios, { AxiosError, type AxiosProgressEvent } from 'axios'
import axiosRetry from 'axios-retry'
import type {
  DetectResponse,
  HealthResponse,
  ReportRequest,
  ReportResponse,
  UploadProgress,
} from '../types/detection'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 60_000,
})

axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    if (axiosRetry.isNetworkError(error)) return true
    const status = error.response?.status
    return status === 429 || status === 502 || status === 503 || status === 504
  },
})

api.interceptors.request.use((config) => {
  const key = import.meta.env.VITE_API_KEY
  if (key) {
    config.headers.set('X-API-Key', key)
  }
  return config
})

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const ax = error as AxiosError<{ detail?: string | { msg?: string }[] }>
    if (ax.code === 'ERR_NETWORK') {
      return 'Нет связи с сервером. Проверьте, что backend запущен.'
    }
    if (ax.code === 'ECONNABORTED') {
      return 'Превышено время ожидания ответа сервера.'
    }
    const detail = ax.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      return detail.map((d) => d.msg ?? JSON.stringify(d)).join('; ')
    }
    if (ax.response?.status === 429) {
      return 'Слишком много запросов. Подождите или укажите API-ключ.'
    }
    return ax.message || 'Ошибка запроса'
  }
  if (error instanceof Error) return error.message
  return 'Неизвестная ошибка'
}

export async function healthCheck(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>('/health')
  return data
}

export async function detectDamage(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<DetectResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await api.post<DetectResponse>('/api/detect', formData, {
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (!onProgress) return
      const total = event.total ?? file.size
      const loaded = event.loaded
      const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0
      onProgress({ loaded, total, percent })
    },
  })
  return data
}

export async function generateReport(payload: ReportRequest): Promise<ReportResponse> {
  const { data } = await api.post<ReportResponse>('/api/report', payload)
  return data
}
