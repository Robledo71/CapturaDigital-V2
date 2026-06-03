// tests/unit/services/publishedReportesService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  getPublishedReportes,
  getReporteForExcel,
} from '@/back/services/publishedReportesService'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRawRow(overrides: Partial<{
  id: number
  published_at: string | null
  client_name: string | null
  plant_name: string | null
  cotizacion: string | null
  part_number: string | null
  total_pieces: number
  ng_pieces: number
  supervisor_name: string | null
}> = {}) {
  return {
    id: 1,
    published_at: '2024-03-15T10:00:00.000Z',
    client_name: 'Honda México',
    plant_name: 'Honda Celaya',
    cotizacion: 'COT-001',
    part_number: 'HN-5540',
    total_pieces: 1000,
    ng_pieces: 50,
    supervisor_name: 'María García',
    ...overrides,
  }
}

function makeRawFullReport() {
  return {
    id: 7,
    shift: 'matutino',
    report_date: '2024-03-15T00:00:00.000Z',
    status: 'published',
    signed_by_name: 'Pedro López',
    published_at: '2024-03-15T18:00:00.000Z',
    published_by_name: 'Ana Soto',
    items: [
      {
        id: 10,
        total_pieces: 500,
        ok_pieces: 480,
        ng_pieces: 20,
        scrap_pieces: 5,
        recovered_pieces: 15,
        incidents: [
          { id: 1, incident_name: 'Rayón', affected_pieces: 10 },
          { id: 2, incident_name: 'Abolladura', affected_pieces: 10 },
        ],
      },
    ],
    order_context: {
      part_number: 'HN-5540',
      part_name: 'Panel Lateral',
      quotation_consecutive: 'COT-001',
      order_consecutive: 'ORD-123',
      client_name: 'Honda México',
      plant_name: 'Honda Celaya',
      supervisor_name: 'María García',
    },
  }
}

function makeOkResponse(data: object) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({ success: true, data }),
  } as unknown as Response
}

function makeErrorResponse(status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue({}),
  } as unknown as Response
}

// ─── getPublishedReportes ─────────────────────────────────────────────────────

describe('getPublishedReportes', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'test-app-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetch exitoso → devuelve ok: true con stats y rows', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkResponse({
        stats: { total: 1, totalPiezas: 1000 },
        rows: [makeRawRow()],
      }),
    )

    const result = await getPublishedReportes('access-token')

    expect(result.ok).toBe(true)
    expect(result.stats.total).toBe(1)
    expect(result.stats.totalPiezas).toBe(1000)
    expect(result.rows).toHaveLength(1)
  })

  it('campos mapeados correctamente desde snake_case a camelCase', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkResponse({
        stats: { total: 1, totalPiezas: 1000 },
        rows: [makeRawRow()],
      }),
    )

    const result = await getPublishedReportes('access-token')
    const row = result.rows[0]

    expect(row.id).toBe('1')
    expect(row.cliente).toBe('Honda México')
    expect(row.planta).toBe('Honda Celaya')
    expect(row.cotizacion).toBe('COT-001')
    expect(row.parte).toBe('HN-5540')
    expect(row.piezas).toBe(1000)
    expect(row.supervisor).toBe('María García')
    expect(row.publicadoAt).toBe('2024-03-15T10:00:00.000Z')
  })

  it('pctNG se calcula como ng_pieces / total_pieces', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkResponse({
        stats: { total: 1, totalPiezas: 1000 },
        rows: [makeRawRow({ total_pieces: 1000, ng_pieces: 100 })],
      }),
    )

    const result = await getPublishedReportes('access-token')
    expect(result.rows[0].pctNG).toBe(0.1)
  })

  it('total_pieces = 0 → pctNG es 0 (evita división por cero)', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkResponse({
        stats: { total: 1, totalPiezas: 0 },
        rows: [makeRawRow({ total_pieces: 0, ng_pieces: 0 })],
      }),
    )

    const result = await getPublishedReportes('access-token')
    expect(result.rows[0].pctNG).toBe(0)
  })

  it('campos nulos → se reemplazan con "—"', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkResponse({
        stats: { total: 1, totalPiezas: 0 },
        rows: [
          makeRawRow({
            client_name: null,
            plant_name: null,
            cotizacion: null,
            part_number: null,
            supervisor_name: null,
          }),
        ],
      }),
    )

    const result = await getPublishedReportes('access-token')
    const row = result.rows[0]
    expect(row.cliente).toBe('—')
    expect(row.planta).toBe('—')
    expect(row.cotizacion).toBe('—')
    expect(row.parte).toBe('—')
    expect(row.supervisor).toBe('—')
  })

  it('fetch falla (res.ok = false) → lanza un error', async () => {
    vi.mocked(fetch).mockResolvedValue(makeErrorResponse(503))

    await expect(getPublishedReportes('access-token')).rejects.toThrow(
      'getPublishedReportes failed: 503',
    )
  })
})

// ─── getReporteForExcel ───────────────────────────────────────────────────────

describe('getReporteForExcel', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'test-app-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetch exitoso → devuelve ExcelReporteData con campos correctos', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkResponse(makeRawFullReport()),
    )

    const result = await getReporteForExcel('7', 'access-token')

    expect(result).not.toBeNull()
    expect(result!.consecutiveNumber).toBe('7')
    expect(result!.planta).toBe('Honda Celaya')
    expect(result!.clienteCobro).toBe('Honda México')
    expect(result!.turno).toBe('matutino')
    expect(result!.cotizacion).toBe('COT-001')
    expect(result!.status).toBe('Publicado')
  })

  it('totalInspected, totalOk, totalNg acumulan los items', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkResponse(makeRawFullReport()),
    )

    const result = await getReporteForExcel('7', 'access-token')

    expect(result!.totalInspected).toBe(500)
    expect(result!.totalOk).toBe(480)
    expect(result!.totalNg).toBe(20)
    expect(result!.totalScrap).toBe(5)
    expect(result!.totalRecovered).toBe(15)
  })

  it('pctNG se calcula en porcentaje como string', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkResponse(makeRawFullReport()),
    )

    const result = await getReporteForExcel('7', 'access-token')
    // 20/500 = 4.00%
    expect(result!.pctNG).toBe('4.00%')
  })

  it('incidencias se concatenan como lista única', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkResponse(makeRawFullReport()),
    )

    const result = await getReporteForExcel('7', 'access-token')
    expect(result!.incidencias).toContain('Rayón')
    expect(result!.incidencias).toContain('Abolladura')
  })

  it('items del Excel tienen los campos mapeados', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkResponse(makeRawFullReport()),
    )

    const result = await getReporteForExcel('7', 'access-token')

    expect(result!.items).toHaveLength(1)
    const item = result!.items[0]
    expect(item.inspected).toBe(500)
    expect(item.ok).toBe(480)
    expect(item.ng).toBe(20)
    expect(item.scrap).toBe(5)
    expect(item.recovered).toBe(15)
  })

  it('fetch 404 → devuelve null', async () => {
    vi.mocked(fetch).mockResolvedValue(makeErrorResponse(404))

    const result = await getReporteForExcel('99', 'access-token')
    expect(result).toBeNull()
  })

  it('reportId no numérico → devuelve null sin llamar a fetch', async () => {
    const result = await getReporteForExcel('no-es-numero', 'access-token')
    expect(result).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('fetch falla con error distinto a 404 → lanza un error', async () => {
    vi.mocked(fetch).mockResolvedValue(makeErrorResponse(500))

    await expect(getReporteForExcel('7', 'access-token')).rejects.toThrow(
      'getReporteForExcel failed: 500',
    )
  })
})
