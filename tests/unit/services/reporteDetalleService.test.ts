// tests/unit/services/reporteDetalleService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  SAMPLING_RULES,
  getSamplingRule,
  signReporte,
  publishReporte,
  getReporteDetalle,
  registerSamplingDetalle,
} from '@/back/services/reporteDetalleService'

// ─── SAMPLING_RULES shape ────────────────────────────────────────────────────

describe('SAMPLING_RULES', () => {
  it('tiene exactamente 14 entradas', () => {
    expect(SAMPLING_RULES).toHaveLength(14)
  })

  it('está ordenado por min ascendente', () => {
    for (let i = 1; i < SAMPLING_RULES.length; i++) {
      expect(SAMPLING_RULES[i].min).toBeGreaterThan(SAMPLING_RULES[i - 1].min)
    }
  })
})

// ─── getSamplingRule — todos los rangos ──────────────────────────────────────

describe('getSamplingRule', () => {
  it('rango 1: min=2, max=8  → sampleSize=2, maxDefects=1', () => {
    expect(getSamplingRule(2)).toEqual({ min: 2, max: 8, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(5)).toEqual({ min: 2, max: 8, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(8)).toEqual({ min: 2, max: 8, sampleSize: 2, maxDefects: 1 })
  })

  it('rango 2: min=9, max=15 → sampleSize=2, maxDefects=1', () => {
    expect(getSamplingRule(9)).toEqual({ min: 9, max: 15, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(12)).toEqual({ min: 9, max: 15, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(15)).toEqual({ min: 9, max: 15, sampleSize: 2, maxDefects: 1 })
  })

  it('rango 3: min=16, max=25 → sampleSize=2, maxDefects=1', () => {
    expect(getSamplingRule(16)).toEqual({ min: 16, max: 25, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(20)).toEqual({ min: 16, max: 25, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(25)).toEqual({ min: 16, max: 25, sampleSize: 2, maxDefects: 1 })
  })

  it('rango 4: min=26, max=50 → sampleSize=2, maxDefects=1', () => {
    expect(getSamplingRule(26)).toEqual({ min: 26, max: 50, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(38)).toEqual({ min: 26, max: 50, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(50)).toEqual({ min: 26, max: 50, sampleSize: 2, maxDefects: 1 })
  })

  it('rango 5: min=51, max=90 → sampleSize=2, maxDefects=1', () => {
    expect(getSamplingRule(51)).toEqual({ min: 51, max: 90, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(70)).toEqual({ min: 51, max: 90, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(90)).toEqual({ min: 51, max: 90, sampleSize: 2, maxDefects: 1 })
  })

  it('rango 6: min=91, max=150 → sampleSize=2, maxDefects=1', () => {
    expect(getSamplingRule(91)).toEqual({ min: 91, max: 150, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(120)).toEqual({ min: 91, max: 150, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(150)).toEqual({ min: 91, max: 150, sampleSize: 2, maxDefects: 1 })
  })

  it('rango 7: min=151, max=280 → sampleSize=5, maxDefects=1', () => {
    expect(getSamplingRule(151)).toEqual({ min: 151, max: 280, sampleSize: 5, maxDefects: 1 })
    expect(getSamplingRule(200)).toEqual({ min: 151, max: 280, sampleSize: 5, maxDefects: 1 })
    expect(getSamplingRule(280)).toEqual({ min: 151, max: 280, sampleSize: 5, maxDefects: 1 })
  })

  it('rango 8: min=281, max=500 → sampleSize=8, maxDefects=1', () => {
    expect(getSamplingRule(281)).toEqual({ min: 281, max: 500, sampleSize: 8, maxDefects: 1 })
    expect(getSamplingRule(390)).toEqual({ min: 281, max: 500, sampleSize: 8, maxDefects: 1 })
    expect(getSamplingRule(500)).toEqual({ min: 281, max: 500, sampleSize: 8, maxDefects: 1 })
  })

  it('rango 9: min=501, max=1200 → sampleSize=12, maxDefects=2', () => {
    expect(getSamplingRule(501)).toEqual({ min: 501, max: 1200, sampleSize: 12, maxDefects: 2 })
    expect(getSamplingRule(850)).toEqual({ min: 501, max: 1200, sampleSize: 12, maxDefects: 2 })
    expect(getSamplingRule(1200)).toEqual({ min: 501, max: 1200, sampleSize: 12, maxDefects: 2 })
  })

  it('rango 10: min=1201, max=3200 → sampleSize=20, maxDefects=2', () => {
    expect(getSamplingRule(1201)).toEqual({ min: 1201, max: 3200, sampleSize: 20, maxDefects: 2 })
    expect(getSamplingRule(2000)).toEqual({ min: 1201, max: 3200, sampleSize: 20, maxDefects: 2 })
    expect(getSamplingRule(3200)).toEqual({ min: 1201, max: 3200, sampleSize: 20, maxDefects: 2 })
  })

  it('rango 11: min=3201, max=10000 → sampleSize=32, maxDefects=3', () => {
    expect(getSamplingRule(3201)).toEqual({ min: 3201, max: 10000, sampleSize: 32, maxDefects: 3 })
    expect(getSamplingRule(6000)).toEqual({ min: 3201, max: 10000, sampleSize: 32, maxDefects: 3 })
    expect(getSamplingRule(10000)).toEqual({ min: 3201, max: 10000, sampleSize: 32, maxDefects: 3 })
  })

  it('rango 12: min=10001, max=35000 → sampleSize=50, maxDefects=4', () => {
    expect(getSamplingRule(10001)).toEqual({ min: 10001, max: 35000, sampleSize: 50, maxDefects: 4 })
    expect(getSamplingRule(20000)).toEqual({ min: 10001, max: 35000, sampleSize: 50, maxDefects: 4 })
    expect(getSamplingRule(35000)).toEqual({ min: 10001, max: 35000, sampleSize: 50, maxDefects: 4 })
  })

  it('rango 13: min=35001, max=150000 → sampleSize=80, maxDefects=5', () => {
    expect(getSamplingRule(35001)).toEqual({ min: 35001, max: 150000, sampleSize: 80, maxDefects: 5 })
    expect(getSamplingRule(90000)).toEqual({ min: 35001, max: 150000, sampleSize: 80, maxDefects: 5 })
    expect(getSamplingRule(150000)).toEqual({ min: 35001, max: 150000, sampleSize: 80, maxDefects: 5 })
  })

  it('rango 14: min=150001, max=500000 → sampleSize=125, maxDefects=6', () => {
    expect(getSamplingRule(150001)).toEqual({ min: 150001, max: 500000, sampleSize: 125, maxDefects: 6 })
    expect(getSamplingRule(300000)).toEqual({ min: 150001, max: 500000, sampleSize: 125, maxDefects: 6 })
    expect(getSamplingRule(500000)).toEqual({ min: 150001, max: 500000, sampleSize: 125, maxDefects: 6 })
  })

  it('valor 1 (por debajo del mínimo) devuelve null', () => {
    expect(getSamplingRule(1)).toBeNull()
  })

  it('valor 0 devuelve null', () => {
    expect(getSamplingRule(0)).toBeNull()
  })

  it('valor 500001 (por encima del máximo) devuelve null', () => {
    expect(getSamplingRule(500001)).toBeNull()
  })

  it('límite entre rangos — 8 es max del rango 1, 9 es min del rango 2', () => {
    expect(getSamplingRule(8)).toEqual({ min: 2, max: 8, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(9)).toEqual({ min: 9, max: 15, sampleSize: 2, maxDefects: 1 })
  })
})

// ─── signReporte ─────────────────────────────────────────────────────────────

describe('signReporte', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'test-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('respuesta exitosa → { ok: true, status: "signed" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    )

    const result = await signReporte(42, 'access-token')
    expect(result).toEqual({ ok: true, status: 'signed' })
  })

  it('respuesta 404 → { ok: false, reason: "not_found" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Not Found', { status: 404 }),
    )

    const result = await signReporte(42, 'access-token')
    expect(result).toEqual({ ok: false, reason: 'not_found' })
  })

  it('respuesta 409 → { ok: false, reason: "invalid_status" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Conflict', { status: 409 }),
    )

    const result = await signReporte(42, 'access-token')
    expect(result).toEqual({ ok: false, reason: 'invalid_status' })
  })

  it('respuesta 500 → lanza error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Server Error', { status: 500 }),
    )

    await expect(signReporte(42, 'access-token')).rejects.toThrow('sign failed: 500')
  })
})

// ─── publishReporte ──────────────────────────────────────────────────────────

describe('publishReporte', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'test-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('respuesta exitosa → { ok: true, status: "published" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    )

    const result = await publishReporte(99, 'access-token')
    expect(result).toEqual({ ok: true, status: 'published' })
  })

  it('respuesta 404 → { ok: false, reason: "not_found" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Not Found', { status: 404 }),
    )

    const result = await publishReporte(99, 'access-token')
    expect(result).toEqual({ ok: false, reason: 'not_found' })
  })

  it('respuesta 409 → { ok: false, reason: "invalid_status" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Conflict', { status: 409 }),
    )

    const result = await publishReporte(99, 'access-token')
    expect(result).toEqual({ ok: false, reason: 'invalid_status' })
  })

  it('respuesta 500 → lanza error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Server Error', { status: 500 }),
    )

    await expect(publishReporte(99, 'access-token')).rejects.toThrow('publish failed: 500')
  })
})

// ─── getReporteDetalle ────────────────────────────────────────────────────────

const mockApiReport = {
  id: 42,
  status: 'submitted',
  shift: 'M',
  report_date: '2026-01-15',
  created_at: '2026-01-15T08:00:00Z',
  signed_at: null,
  published_at: null,
  operators: [{ operator_name: 'Juan López' }],
  sampling_results: [],
  fully_sampled: false,
  sampled_at: null,
  items: [
    {
      id: 1,
      total_pieces: 300,
      ok_pieces: 290,
      ng_pieces: 10,
      scrap_pieces: 5,
      recovered_pieces: 5,
      lote: 'L-001',
      serie: null,
      identificadores: null,
      incidents: [{ incident_name: 'Rayadura', affected_pieces: 10 }],
      sampling: {
        required: true,
        sampled: false,
        sampled_pieces: 0,
        ok_pieces: null,
        ng_pieces: null,
        result: null,
        sampled_by_name: null,
        sampled_at: null,
      },
    },
  ],
  order_context: {
    quotation_consecutive: 'OV-86068-CO-29462',
    part_number: '83600-3BH',
    part_name: 'MAT SET FLOOR',
    client_name: 'Bimbo S.A.',
    plant_name: 'Honda Celaya',
    supervisor_name: 'Pedro Ramírez',
    fecha_inicio: '2026-01-15T07:00:00Z',
    fecha_fin: null,
  },
}

describe('getReporteDetalle', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'app-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('id no numérico → null sin llamar fetch', async () => {
    const result = await getReporteDetalle('abc', 'tok')
    expect(result).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('respuesta 404 → null', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 404 }))
    const result = await getReporteDetalle('99', 'tok')
    expect(result).toBeNull()
  })

  it('respuesta 500 → lanza error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('error', { status: 500 }))
    await expect(getReporteDetalle('1', 'tok')).rejects.toThrow('getReporteDetalle failed: 500')
  })

  it('respuesta exitosa → mapea reportId, status y totales correctamente', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: mockApiReport }), { status: 200 }),
    )
    const result = await getReporteDetalle('42', 'tok')
    expect(result).not.toBeNull()
    expect(result!.reportId).toBe(42)
    expect(result!.totalInspected).toBe(300)
    expect(result!.totalOk).toBe(290)
    expect(result!.totalNg).toBe(10)
    expect(result!.totalScrap).toBe(5)
    expect(result!.totalRecovered).toBe(5)
  })

  it('mapea cliente, planta, cotización y parte desde order_context', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: mockApiReport }), { status: 200 }),
    )
    const result = await getReporteDetalle('42', 'tok')
    expect(result!.cliente).toBe('Bimbo S.A.')
    expect(result!.planta).toBe('Honda Celaya')
    expect(result!.cotizacion).toBe('OV-86068-CO-29462')
    expect(result!.parte).toBe('83600-3BH')
  })

  it('mapea operadores como string concatenado', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: mockApiReport }), { status: 200 }),
    )
    const result = await getReporteDetalle('42', 'tok')
    expect(result!.operadores).toBe('Juan López')
  })

  it('items tienen incidencias mapeadas', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: mockApiReport }), { status: 200 }),
    )
    const result = await getReporteDetalle('42', 'tok')
    expect(result!.inspectionItems[0].incidents[0].description).toBe('Rayadura')
    expect(result!.inspectionItems[0].incidents[0].count).toBe(10)
  })

  it('llama a la URL correcta con el reportId', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: mockApiReport }), { status: 200 }),
    )
    await getReporteDetalle('42', 'tok')
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('/qb_sync/daily-reports/42')
  })

  // ── Estado derivado + muestreo por ítem (nuevo contrato) ──────────────────

  it('submitted + fully_sampled:true → status efectivo "sampling" (listo para firmar)', async () => {
    const report = { ...mockApiReport, status: 'submitted', fully_sampled: true, sampled_at: '2026-01-15T10:00:00Z' }
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: report }), { status: 200 }),
    )
    const result = await getReporteDetalle('42', 'tok')
    expect(result!.status).toBe('sampling')
  })

  it('submitted + fully_sampled:false → status se mantiene "submitted"', async () => {
    const report = { ...mockApiReport, status: 'submitted', fully_sampled: false }
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: report }), { status: 200 }),
    )
    const result = await getReporteDetalle('42', 'tok')
    expect(result!.status).toBe('submitted')
  })

  it('sampleApproved/sampleSize/sampleNg se derivan de fully_sampled y del muestreo por ítem', async () => {
    const report = {
      ...mockApiReport,
      status: 'submitted',
      fully_sampled: true,
      sampled_at: '2026-01-15T10:00:00Z',
      items: [
        {
          ...mockApiReport.items[0],
          sampling: {
            required: true,
            sampled: true,
            sampled_pieces: 12,
            ok_pieces: 10,
            ng_pieces: 2,
            result: 'aprobado',
            sampled_by_name: 'Pedro Ramírez',
            sampled_at: '2026-01-15T10:00:00Z',
          },
        },
      ],
    }
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: report }), { status: 200 }),
    )
    const result = await getReporteDetalle('42', 'tok')
    expect(result!.sampleApproved).toBe(true)
    expect(result!.sampleSize).toBe(12)
    expect(result!.sampleNg).toBe(2)
    expect(result!.sampledAt).toEqual(new Date('2026-01-15T10:00:00Z'))
  })

  it('el muestreo por ítem se mapea a inspectionItems[].sampling (camelCase)', async () => {
    const report = {
      ...mockApiReport,
      items: [
        {
          ...mockApiReport.items[0],
          sampling: {
            required: true,
            sampled: true,
            sampled_pieces: 8,
            ok_pieces: 7,
            ng_pieces: 1,
            result: 'no_aprobado',
            sampled_by_name: 'Pedro Ramírez',
            sampled_at: '2026-01-15T09:00:00Z',
          },
        },
      ],
    }
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: report }), { status: 200 }),
    )
    const result = await getReporteDetalle('42', 'tok')
    expect(result!.inspectionItems[0].sampling).toEqual({
      required: true,
      sampled: true,
      result: 'no_aprobado',
      sampledPieces: 8,
      ng: 1,
      needsEdit: false,
      observations: null,
      sampledByName: 'Pedro Ramírez',
      sampledAt: '2026-01-15T09:00:00Z',
    })
  })

  it('ítem sin campo sampling (fila legacy) → default derivado de getSamplingRule', async () => {
    const report = {
      ...mockApiReport,
      items: [
        {
          ...mockApiReport.items[0],
          sampling: undefined,
        },
      ],
    }
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: report }), { status: 200 }),
    )
    const result = await getReporteDetalle('42', 'tok')
    expect(result!.inspectionItems[0].sampling).toEqual({
      required: true, // 300 piezas cae en un rango de getSamplingRule
      sampled: false,
      result: null,
      sampledPieces: 0,
      ng: null,
      needsEdit: false,
      observations: null,
      sampledByName: null,
      sampledAt: null,
    })
  })
})

// ─── registerSamplingDetalle ──────────────────────────────────────────────────

describe('registerSamplingDetalle', () => {
  const baseInput = {
    reportId: 10,
    itemId: 1,
    defects: 0,
    accessToken: 'tok',
  }

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'app-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('respuesta exitosa aprobada → { ok: true, approved: true, ... }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: true, data: { approved: true, sampled_pieces: 2, ng: 0, max_defects: 1 } }),
        { status: 201 },
      ),
    )
    const result = await registerSamplingDetalle(baseInput)
    expect(result).toEqual({ ok: true, approved: true, sampledPieces: 2, ng: 0, maxDefects: 1 })
  })

  it('respuesta exitosa no aprobada → { ok: true, approved: false, ... }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: true, data: { approved: false, sampled_pieces: 2, ng: 2, max_defects: 1 } }),
        { status: 201 },
      ),
    )
    const result = await registerSamplingDetalle({ ...baseInput, defects: 2 })
    expect(result).toEqual({ ok: true, approved: false, sampledPieces: 2, ng: 2, maxDefects: 1 })
  })

  it('respuesta 404 → { ok: false, reason: "not_found" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 404 }))
    const result = await registerSamplingDetalle(baseInput)
    expect(result).toEqual({ ok: false, reason: 'not_found' })
  })

  it('respuesta 409 con reason "invalid_status" → { ok: false, reason: "invalid_status" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ reason: 'invalid_status' }), { status: 409 }),
    )
    const result = await registerSamplingDetalle(baseInput)
    expect(result).toEqual({ ok: false, reason: 'invalid_status' })
  })

  it('respuesta 422 con reason "no_sampling_items" → { ok: false, reason: "no_sampling_items" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ reason: 'no_sampling_items' }), { status: 422 }),
    )
    const result = await registerSamplingDetalle(baseInput)
    expect(result).toEqual({ ok: false, reason: 'no_sampling_items' })
  })

  it('respuesta 422 con reason "item_not_found" → { ok: false, reason: "item_not_found" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ reason: 'item_not_found' }), { status: 422 }),
    )
    const result = await registerSamplingDetalle(baseInput)
    expect(result).toEqual({ ok: false, reason: 'item_not_found' })
  })

  it('respuesta 422 con reason desconocido → { ok: false, reason: "invalid_status" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ reason: 'algo_raro' }), { status: 422 }),
    )
    const result = await registerSamplingDetalle(baseInput)
    expect(result).toEqual({ ok: false, reason: 'invalid_status' })
  })

  it('respuesta 400 (body inválido) → { ok: false, reason: "error" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 400 }))
    const result = await registerSamplingDetalle(baseInput)
    expect(result).toEqual({ ok: false, reason: 'error' })
  })

  it('respuesta 500 → { ok: false, reason: "error" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('error', { status: 500 }))
    const result = await registerSamplingDetalle(baseInput)
    expect(result).toEqual({ ok: false, reason: 'error' })
  })

  it('llama al endpoint correcto con el body correcto', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { approved: true, sampled_pieces: 2, ng: 0, max_defects: 1 } }), { status: 201 }),
    )
    await registerSamplingDetalle({ ...baseInput, itemId: 7, defects: 2 })
    const [url, opts] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('/qb_sync/daily-reports/10/sampling')
    const body = JSON.parse((opts as RequestInit).body as string)
    expect(body.item_id).toBe(7)
    expect(body.defects).toBe(2)
  })
})
