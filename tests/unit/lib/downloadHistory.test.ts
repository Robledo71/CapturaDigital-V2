// tests/unit/lib/downloadHistory.test.ts
// downloadHistory.ts usa localStorage — simulamos window/localStorage en el entorno de test
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock de localStorage antes de importar el módulo
const storage: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => storage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { storage[key] = value }),
  removeItem: vi.fn((key: string) => { delete storage[key] }),
  clear: vi.fn(() => { Object.keys(storage).forEach(k => delete storage[k]) }),
}

Object.defineProperty(globalThis, 'window', { value: globalThis, writable: true })
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

import {
  readDownloadHistory,
  upsertDownloadRecord,
  getDownloadedIds,
} from '@/front/lib/downloadHistory'
import type { PublishedReporteRow } from '@/back/services/publishedReportesService'

function makeRow(id: string, overrides: Partial<PublishedReporteRow> = {}): PublishedReporteRow {
  return {
    id,
    consecutiveNumber: `OV-${id}`,
    cliente: 'Bimbo S.A.',
    planta: 'Honda Celaya',
    cotizacion: `OV-${id}-CO-100`,
    parte: 'PN-001',
    piezas: '500',
    pctNG: '2.0%',
    publicadoAt: '2026-01-15T10:00:00Z',
    supervisor: 'Juan López',
    ...overrides,
  }
}

describe('downloadHistory', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    // Resetear storage
    Object.keys(storage).forEach(k => delete storage[k])
  })

  // ── readDownloadHistory ──────────────────────────────────────────────────────

  describe('readDownloadHistory', () => {
    it('retorna [] cuando localStorage está vacío', () => {
      const result = readDownloadHistory()
      expect(result).toEqual([])
    })

    it('retorna [] cuando el valor almacenado no es JSON válido', () => {
      storage['capturacion:downloads'] = 'no-es-json'
      const result = readDownloadHistory()
      expect(result).toEqual([])
    })

    it('retorna [] cuando el valor almacenado no es un array', () => {
      storage['capturacion:downloads'] = JSON.stringify({ id: '1' })
      const result = readDownloadHistory()
      expect(result).toEqual([])
    })

    it('filtra entradas inválidas del array', () => {
      storage['capturacion:downloads'] = JSON.stringify([
        { id: '1', downloadedAt: '2026-01-01' },
        null,
        { id: 2, downloadedAt: '2026-01-02' }, // id es número, no string
        { downloadedAt: '2026-01-03' },          // falta id
      ])
      const result = readDownloadHistory()
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('retorna los registros correctamente almacenados', () => {
      const record = { ...makeRow('abc'), downloadedAt: '2026-01-15T10:00:00Z' }
      storage['capturacion:downloads'] = JSON.stringify([record])
      const result = readDownloadHistory()
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('abc')
      expect(result[0].downloadedAt).toBe('2026-01-15T10:00:00Z')
    })
  })

  // ── upsertDownloadRecord ─────────────────────────────────────────────────────

  describe('upsertDownloadRecord', () => {
    it('agrega un nuevo registro y lo guarda en localStorage', () => {
      const row = makeRow('1')
      const result = upsertDownloadRecord(row)

      expect(result.id).toBe('1')
      expect(typeof result.downloadedAt).toBe('string')
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('el registro guardado tiene downloadedAt en formato ISO', () => {
      const result = upsertDownloadRecord(makeRow('2'))
      expect(() => new Date(result.downloadedAt)).not.toThrow()
      expect(new Date(result.downloadedAt).getTime()).toBeGreaterThan(0)
    })

    it('reemplaza un registro existente con el mismo id (upsert)', () => {
      upsertDownloadRecord(makeRow('5'))
      upsertDownloadRecord(makeRow('5')) // segunda vez

      const history = readDownloadHistory()
      const entries = history.filter(r => r.id === '5')
      expect(entries).toHaveLength(1)
    })

    it('preserva otros registros al hacer upsert', () => {
      upsertDownloadRecord(makeRow('A'))
      upsertDownloadRecord(makeRow('B'))
      upsertDownloadRecord(makeRow('A')) // actualiza A sin borrar B

      const history = readDownloadHistory()
      expect(history.some(r => r.id === 'B')).toBe(true)
    })

    it('el registro más reciente queda primero en el historial', () => {
      upsertDownloadRecord(makeRow('primero'))
      upsertDownloadRecord(makeRow('segundo'))

      const history = readDownloadHistory()
      expect(history[0].id).toBe('segundo')
    })
  })

  // ── getDownloadedIds ─────────────────────────────────────────────────────────

  describe('getDownloadedIds', () => {
    it('retorna Set vacío cuando no hay historial', () => {
      const ids = getDownloadedIds()
      expect(ids.size).toBe(0)
    })

    it('retorna un Set con los ids descargados', () => {
      upsertDownloadRecord(makeRow('x1'))
      upsertDownloadRecord(makeRow('x2'))

      const ids = getDownloadedIds()
      expect(ids.has('x1')).toBe(true)
      expect(ids.has('x2')).toBe(true)
      expect(ids.has('x3')).toBe(false)
    })

    it('el Set permite verificar membership en O(1)', () => {
      upsertDownloadRecord(makeRow('z99'))
      const ids = getDownloadedIds()
      expect(ids instanceof Set).toBe(true)
    })
  })
})
