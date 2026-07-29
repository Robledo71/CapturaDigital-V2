// tests/unit/services/informalReportesService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getInformalReportes,
  getInformalReporteDetalle,
  registerInformalSamplingDecision,
  updateInformalReportItem,
  signInformalReporte,
} from '@/back/services/informalReportesService'

const ACCESS_TOKEN = 'test-access-token'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  process.env.QSYNC_API_URL = 'http://localhost:3001'
  process.env.X_APP_TOKEN = 'app-token'
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ─── getInformalReportes ──────────────────────────────────────────────────────

function makeListRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    status: 'submitted',
    tipo_orden: 'OV',
    cliente_nombre: 'Bimbo S.A.',
    planta_nombre: 'Honda Celaya',
    numero_parte: '83600-3BH',
    nombre_parte: 'MAT SET FLOOR',
    inspector: 'Juan López',
    horario: 'M',
    fecha_creado: '2026-01-15T08:00:00Z',
    fecha_firmado: null,
    ...overrides,
  }
}

describe('getInformalReportes', () => {
  it('fetch exitoso mapea filas snake_case → camelCase', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: [makeListRow()] }), { status: 200 }),
    )

    const result = await getInformalReportes(ACCESS_TOKEN)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      id: 42,
      status: 'submitted',
      tipoOrden: 'OV',
      clienteNombre: 'Bimbo S.A.',
      plantaNombre: 'Honda Celaya',
      numeroParte: '83600-3BH',
      nombreParte: 'MAT SET FLOOR',
      inspector: 'Juan López',
      horario: 'M',
      fechaCreado: new Date('2026-01-15T08:00:00Z'),
      fechaFirmado: null,
    })
  })

  it('fecha_firmado presente → se mapea a Date', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: true, data: [makeListRow({ status: 'signed', fecha_firmado: '2026-01-16T10:00:00Z' })] }),
        { status: 200 },
      ),
    )

    const result = await getInformalReportes(ACCESS_TOKEN)
    expect(result[0].status).toBe('signed')
    expect(result[0].fechaFirmado).toEqual(new Date('2026-01-16T10:00:00Z'))
  })

  it('respuesta no-ok lanza error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
    await expect(getInformalReportes(ACCESS_TOKEN)).rejects.toThrow('getInformalReportes failed: 401')
  })

  it('envía cabeceras X-App-Token y Authorization', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: [] }), { status: 200 }),
    )

    await getInformalReportes(ACCESS_TOKEN)

    const headers = vi.mocked(fetch).mock.calls[0][1]!.headers as Record<string, string>
    expect(headers['X-App-Token']).toBe('app-token')
    expect(headers['Authorization']).toBe('Bearer test-access-token')
  })
})

// ─── getInformalReporteDetalle ────────────────────────────────────────────────

const mockApiInformalReport = {
  id: 42,
  status: 'submitted',
  report_date: '2026-01-15T08:00:00Z',
  sampled_at: null,
  fully_sampled: false,
  shift: 'M',
  plant_name: 'Honda Celaya',
  client_name: 'Bimbo S.A.',
  part_number: '83600-3BH',
  tipo_orden: 'OV',
  identifier_types: ['lote'],
  incident_types: ['Rayadura'],
  signed_at: null,
  signed_by: null,
  operators: ['Juan López'],
  items: [
    {
      id: 1,
      identifier: { lote: 'L-001', serie: null, otros: null },
      total_pieces: 300,
      ok_pieces: 290,
      ng_pieces: 10,
      scrap_pieces: 5,
      recovered_pieces: 5,
      pieces_by_incident: [{ incident_name: 'Rayadura', affected_pieces: 10 }],
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
}

describe('getInformalReporteDetalle', () => {
  it('id no numérico → null sin llamar fetch', async () => {
    const result = await getInformalReporteDetalle('abc', 'tok')
    expect(result).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('respuesta 404 → null', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 404 }))
    const result = await getInformalReporteDetalle('99', 'tok')
    expect(result).toBeNull()
  })

  it('respuesta 500 → lanza error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('error', { status: 500 }))
    await expect(getInformalReporteDetalle('1', 'tok')).rejects.toThrow('getInformalReporteDetalle failed: 500')
  })

  it('llama a la URL correcta con el reportId', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: mockApiInformalReport }), { status: 200 }),
    )
    await getInformalReporteDetalle('42', 'tok')
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('/qb_sync/informal-reports/42')
  })

  it('mapea reportId y totales desde los items', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: mockApiInformalReport }), { status: 200 }),
    )
    const result = await getInformalReporteDetalle('42', 'tok')
    expect(result).not.toBeNull()
    expect(result!.reportId).toBe(42)
    expect(result!.totalInspected).toBe(300)
    expect(result!.totalOk).toBe(290)
    expect(result!.totalNg).toBe(10)
    expect(result!.totalScrap).toBe(5)
    expect(result!.totalRecovered).toBe(5)
  })

  it('mapea cliente/planta/parte desde los campos top-level; cotización siempre "—" (no existe en el flujo informal)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: mockApiInformalReport }), { status: 200 }),
    )
    const result = await getInformalReporteDetalle('42', 'tok')
    expect(result!.cliente).toBe('Bimbo S.A.')
    expect(result!.planta).toBe('Honda Celaya')
    expect(result!.parte).toBe('83600-3BH')
    expect(result!.cotizacion).toBe('—')
  })

  it('isLegacy es siempre false y publishedAt siempre null (los informales nunca se publican)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: mockApiInformalReport }), { status: 200 }),
    )
    const result = await getInformalReporteDetalle('42', 'tok')
    expect(result!.isLegacy).toBe(false)
    expect(result!.publishedAt).toBeNull()
  })

  it('mapea operadores (array de strings) como string concatenado', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: mockApiInformalReport }), { status: 200 }),
    )
    const result = await getInformalReporteDetalle('42', 'tok')
    expect(result!.operadores).toBe('Juan López')
  })

  it('mapea identifier{lote,serie,otros} e incidencias pieces_by_incident', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: mockApiInformalReport }), { status: 200 }),
    )
    const result = await getInformalReporteDetalle('42', 'tok')
    expect(result!.inspectionItems[0].lote).toBe('L-001')
    expect(result!.inspectionItems[0].serie).toBeNull()
    expect(result!.inspectionItems[0].incidents[0]).toEqual({ description: 'Rayadura', count: 10 })
  })

  it('identifier.otros con valores → identificadores formateado "clave: valor"', async () => {
    const report = {
      ...mockApiInformalReport,
      items: [
        {
          ...mockApiInformalReport.items[0],
          identifier: { lote: null, serie: null, otros: { Máquina: 'X1' } },
        },
      ],
    }
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ data: report }), { status: 200 }))
    const result = await getInformalReporteDetalle('42', 'tok')
    expect(result!.inspectionItems[0].identificadores).toBe('Máquina: X1')
  })

  it('submitted + fully_sampled:true → status efectivo "sampling"', async () => {
    const report = { ...mockApiInformalReport, status: 'submitted', fully_sampled: true, sampled_at: '2026-01-15T10:00:00Z' }
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ data: report }), { status: 200 }))
    const result = await getInformalReporteDetalle('42', 'tok')
    expect(result!.status).toBe('sampling')
  })

  it('submitted + fully_sampled:false → status se mantiene "submitted"', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: mockApiInformalReport }), { status: 200 }),
    )
    const result = await getInformalReporteDetalle('42', 'tok')
    expect(result!.status).toBe('submitted')
  })

  it('status "signed" pasa directo (nunca hay "published" en el flujo informal)', async () => {
    const report = { ...mockApiInformalReport, status: 'signed', signed_at: '2026-01-16T09:00:00Z', signed_by: 'Pedro Ramírez', fully_sampled: true }
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ data: report }), { status: 200 }))
    const result = await getInformalReporteDetalle('42', 'tok')
    expect(result!.status).toBe('signed')
    expect(result!.signedAt).toEqual(new Date('2026-01-16T09:00:00Z'))
    // No hay un "supervisor" expuesto por el contrato informal — se usa el firmante.
    expect(result!.supervisorName).toBe('Pedro Ramírez')
  })

  it('sampleSize/sampleNg se derivan del muestreo por ítem', async () => {
    const report = {
      ...mockApiInformalReport,
      fully_sampled: true,
      sampled_at: '2026-01-15T10:00:00Z',
      items: [
        {
          ...mockApiInformalReport.items[0],
          sampling: {
            required: true,
            sampled: true,
            sampled_pieces: 8,
            ok_pieces: 7,
            ng_pieces: 1,
            result: 'aprobado',
            sampled_by_name: 'Pedro Ramírez',
            sampled_at: '2026-01-15T10:00:00Z',
          },
        },
      ],
    }
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ data: report }), { status: 200 }))
    const result = await getInformalReporteDetalle('42', 'tok')
    expect(result!.sampleSize).toBe(8)
    expect(result!.sampleNg).toBe(1)
    expect(result!.sampleApproved).toBe(true)
  })

  it('no expone datos de sesión de captura (tablet/fecha_inicio/fin) — quedan en null/"—"', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: mockApiInformalReport }), { status: 200 }),
    )
    const result = await getInformalReporteDetalle('42', 'tok')
    expect(result!.tabletAlias).toBe('—')
    expect(result!.sessionCreatedAt).toBeNull()
    expect(result!.sessionFinishedAt).toBeNull()
  })
})

// ─── registerInformalSamplingDecision ─────────────────────────────────────────

describe('registerInformalSamplingDecision', () => {
  const baseInput = {
    reportId: 10,
    accessToken: 'tok',
    decision: 'approve' as const,
    defectsByItem: { 1: 0 },
    notes: '',
  }

  it('aprobación exitosa → { ok: true, status: "sampling" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 200 }))
    const result = await registerInformalSamplingDecision(baseInput)
    expect(result).toEqual({ ok: true, status: 'sampling' })
  })

  it('rechazo exitoso → { ok: true, status: "pending" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 200 }))
    const result = await registerInformalSamplingDecision({ ...baseInput, decision: 'reject' })
    expect(result).toEqual({ ok: true, status: 'pending' })
  })

  it('respuesta 404 → { ok: false, reason: "not_found" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 404 }))
    const result = await registerInformalSamplingDecision(baseInput)
    expect(result).toEqual({ ok: false, reason: 'not_found' })
  })

  // El controller de informal-reports SIEMPRE responde 422 (nunca 409) cuando el
  // service lanza un error con `.reason` — incluido 'invalid_status'.
  it('respuesta 422 con reason "invalid_status" → { ok: false, reason: "invalid_status" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ reason: 'invalid_status' }), { status: 422 }),
    )
    const result = await registerInformalSamplingDecision(baseInput)
    expect(result).toEqual({ ok: false, reason: 'invalid_status' })
  })

  it('respuesta 422 con reason "notes_required" → { ok: false, reason: "notes_required" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ reason: 'notes_required' }), { status: 422 }),
    )
    const result = await registerInformalSamplingDecision(baseInput)
    expect(result).toEqual({ ok: false, reason: 'notes_required' })
  })

  it('respuesta 422 con reason "rule_failed" → { ok: false, reason: "rule_failed" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ reason: 'rule_failed' }), { status: 422 }),
    )
    const result = await registerInformalSamplingDecision(baseInput)
    expect(result).toEqual({ ok: false, reason: 'rule_failed' })
  })

  it('respuesta 422 con reason desconocido → { ok: false, reason: "invalid_status" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ reason: 'algo_raro' }), { status: 422 }),
    )
    const result = await registerInformalSamplingDecision(baseInput)
    expect(result).toEqual({ ok: false, reason: 'invalid_status' })
  })

  it('respuesta 500 → lanza error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('error', { status: 500 }))
    await expect(registerInformalSamplingDecision(baseInput)).rejects.toThrow('informal sampling failed: 500')
  })

  it('llama al endpoint correcto con el body correcto', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 200 }))
    await registerInformalSamplingDecision({ ...baseInput, defectsByItem: { 1: 2 }, notes: 'Observación' })
    const [url, opts] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('/qb_sync/informal-reports/10/sampling')
    const body = JSON.parse((opts as RequestInit).body as string)
    expect(body.decision).toBe('approve')
    expect(body.defects_by_item).toEqual({ '1': 2 })
    expect(body.notes).toBe('Observación')
  })
})

// ─── updateInformalReportItem ─────────────────────────────────────────────────

describe('updateInformalReportItem', () => {
  const baseInput = {
    reportId: 10,
    itemId: 5,
    accessToken: 'tok',
    totalPieces: 100,
    okPieces: 90,
    ngPieces: 10,
    scrapPieces: 7,
    recoveredPieces: 3,
    incidents: [],
    motivo: 'Corrección de conteo',
  }

  it('respuesta exitosa → { ok: true }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))
    const result = await updateInformalReportItem(baseInput)
    expect(result).toEqual({ ok: true })
  })

  it('llama al endpoint correcto con el body correcto', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))
    await updateInformalReportItem(baseInput)
    const [url, opts] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('/qb_sync/informal-reports/10/items/5')
    expect((opts as RequestInit).method).toBe('PATCH')
    const body = JSON.parse((opts as RequestInit).body as string)
    expect(body.total_pieces).toBe(100)
    expect(body.ok_pieces).toBe(90)
    expect(body.ng_pieces).toBe(10)
    expect(body.motivo).toBe('Corrección de conteo')
  })

  it('respuesta con error y mensaje → { ok: false, error: mensaje }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Solo se pueden editar ítems de reportes en estado enviado.' }), { status: 409 }),
    )
    const result = await updateInformalReportItem(baseInput)
    expect(result).toEqual({ ok: false, error: 'Solo se pueden editar ítems de reportes en estado enviado.' })
  })

  it('respuesta con error sin mensaje → error genérico', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 500 }))
    const result = await updateInformalReportItem(baseInput)
    expect(result).toEqual({ ok: false, error: 'Error al actualizar el ítem' })
  })
})

// ─── signInformalReporte ──────────────────────────────────────────────────────

describe('signInformalReporte', () => {
  it('respuesta exitosa → { ok: true, status: "signed" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))
    const result = await signInformalReporte(42, 'access-token')
    expect(result).toEqual({ ok: true, status: 'signed' })
  })

  it('respuesta 404 → { ok: false, reason: "not_found" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('Not Found', { status: 404 }))
    const result = await signInformalReporte(42, 'access-token')
    expect(result).toEqual({ ok: false, reason: 'not_found' })
  })

  it('respuesta 409 → { ok: false, reason: "invalid_status" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('Conflict', { status: 409 }))
    const result = await signInformalReporte(42, 'access-token')
    expect(result).toEqual({ ok: false, reason: 'invalid_status' })
  })

  it('respuesta 500 → lanza error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('Server Error', { status: 500 }))
    await expect(signInformalReporte(42, 'access-token')).rejects.toThrow('sign informal report failed: 500')
  })

  it('llama al endpoint correcto', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))
    await signInformalReporte(42, 'access-token')
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('/qb_sync/informal-reports/42/sign')
  })
})
