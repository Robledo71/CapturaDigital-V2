import type { PublishedReporteRow } from '@/back/services/publishedReportesService'

export type DownloadRecord = PublishedReporteRow & { downloadedAt: string }

const STORAGE_KEY = 'capturacion:downloads'

export function readDownloadHistory(): DownloadRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is DownloadRecord =>
        item !== null &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.downloadedAt === 'string',
    )
  } catch {
    return []
  }
}

export function upsertDownloadRecord(row: PublishedReporteRow): DownloadRecord {
  const record: DownloadRecord = { ...row, downloadedAt: new Date().toISOString() }
  const existing = readDownloadHistory().filter((r) => r.id !== row.id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([record, ...existing]))
  return record
}

export function getDownloadedIds(): Set<string> {
  return new Set(readDownloadHistory().map((r) => r.id))
}
