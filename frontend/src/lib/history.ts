import type { HistoryItem } from '../types/detection'

const STORAGE_KEY = 'car-damage-history-v1'
const MAX_ITEMS = 40

function readAll(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as HistoryItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(items: HistoryItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
}

export function listHistory(): HistoryItem[] {
  return readAll().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export function getHistoryItem(id: string): HistoryItem | undefined {
  return readAll().find((item) => item.id === id)
}

export function saveHistoryItem(item: HistoryItem): HistoryItem {
  const items = readAll().filter((x) => x.id !== item.id)
  items.unshift(item)
  writeAll(items)
  return item
}

export function updateHistoryItem(id: string, patch: Partial<HistoryItem>): HistoryItem | undefined {
  const items = readAll()
  const idx = items.findIndex((x) => x.id === id)
  if (idx < 0) return undefined
  items[idx] = { ...items[idx], ...patch }
  writeAll(items)
  return items[idx]
}

export function deleteHistoryItem(id: string): void {
  writeAll(readAll().filter((x) => x.id !== id && x.afterId !== id))
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function fileToDataUrl(file: File, maxSide = 960): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(String(reader.result))
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = () => resolve(String(reader.result))
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

export function createId(): string {
  return crypto.randomUUID()
}
