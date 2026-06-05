// tests/unit/services/reportesService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSupervisorReportes } from '@/back/services/reportesService'

const ACCESS_TOKEN = 'test-token'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRawRow(overrides: { status?: string } = {}) {
  return {
    id: 1,
    order_id: 10,
    cliente: 'Honda',
    planta: 'CDMX Plant',
    cotizacion: 'QT-2024-001',
    parte: 'PN-001',
    inspector: 'Juan Lopez',
    turno: 'Mañana',
    status: overrides.status ?? 'submitted',
    total_pieces: 300,
    total_ng: 15,
    report_date: '2024-01-15',
  }
}

function mockFetch(rows: ReturnType<typeof makeRawRow>[], total: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { rows, total } }),
    }),
  )
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('getSupervisorReportes', () => {
  it('devuelve { rows, total } correctamente mapeados', async () => {
    mockFetch([makeRawRow({ status: 'submitted' })], 1)

    const result = await getSupervisorReportes('sup-1', ACCESS_TOKEN)

    expect(result.total).toBe(1)
    expect(result.rows).toHaveLength(1)

    const row = result.rows[0]
    expect(row.id).toBe('1')
    expect(row.orderId).toBe(10)
    expect(row.cliente).toBe('Honda')
    expect(row.planta).toBe('CDMX Plant')
    expect(row.cotizacion).toBe('QT-2024-001')
    expect(row.parte).toBe('PN-001')
    expect(row.inspector).toBe('Juan Lopez')
    expect(row.turno).toBe('Mañana')
    expect(row.estatus).toBe('Enviado')
    expect(row.piezas).toBe('300')
    expect(row.pctNG).toBe('5.0%')
  })

  it('mapEstatus: submitted → "Enviado"', async () => {
    mockFetch([makeRawRow({ status: 'submitted' })], 1)
    const { rows } = await getSupervisorReportes('sup-1', ACCESS_TOKEN)
    expect(rows[0].estatus).toBe('Enviado')
  })

  it('mapEstatus: sampled → "En muestreo"', async () => {
    mockFetch([makeRawRow({ status: 'sampled' })], 1)
    const { rows } = await getSupervisorReportes('sup-1', ACCESS_TOKEN)
    expect(rows[0].estatus).toBe('En muestreo')
  })

  it('mapEstatus: signed → "Firmado"', async () => {
    mockFetch([makeRawRow({ status: 'signed' })], 1)
    const { rows } = await getSupervisorReportes('sup-1', ACCESS_TOKEN)
    expect(rows[0].estatus).toBe('Firmado')
  })

  it('mapEstatus: published → "Publicado"', async () => {
    mockFetch([makeRawRow({ status: 'published' })], 1)
    const { rows } = await getSupervisorReportes('sup-1', ACCESS_TOKEN)
    expect(rows[0].estatus).toBe('Publicado')
  })

  it('mapEstatus: valor desconocido → "Enviado"', async () => {
    mockFetch([makeRawRow({ status: 'unknown_status' })], 1)
    const { rows } = await getSupervisorReportes('sup-1', ACCESS_TOKEN)
    expect(rows[0].estatus).toBe('Enviado')
  })

  it('llama a /admin-list SIN parámetro page (paginación en cliente)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { rows: [], total: 0 } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await getSupervisorReportes('sup-1', ACCESS_TOKEN)

    const calledUrl = fetchMock.mock.calls[0][0] as string
    expect(calledUrl).toContain('/daily-reports/admin-list')
    expect(calledUrl).not.toContain('page=')
  })

  it('cuando el API devuelve array vacío → rows=[], total=0', async () => {
    mockFetch([], 0)

    const result = await getSupervisorReportes('sup-1', ACCESS_TOKEN)
    expect(result.rows).toEqual([])
    expect(result.total).toBe(0)
  })

  it('pctNG es "-" cuando total_pieces es 0', async () => {
    mockFetch([{ ...makeRawRow(), total_pieces: 0, total_ng: 0 }], 1)

    const { rows } = await getSupervisorReportes('sup-1', ACCESS_TOKEN)
    expect(rows[0].pctNG).toBe('-')
  })
})
