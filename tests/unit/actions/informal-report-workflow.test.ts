// tests/unit/actions/informal-report-workflow.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/back/services/informalReportesService', () => ({
  registerSamplingDetalleInformal: vi.fn(),
  signInformalReporte: vi.fn(),
}))

import { getSession } from '@/back/services/session'
import {
  registerSamplingDetalleInformal,
  signInformalReporte,
} from '@/back/services/informalReportesService'
import {
  registrarMuestreoDetalleInformalAction,
  signInformalReporteAction,
} from '@/app/actions/informal-report-workflow'

// ─── Helpers ─────────────────────────────────────────────────────────────────
// supervisor tiene reportes_informales.{muestreo,firmar} en la matriz SEED de
// permisos.ts; capturacion (solo lectura) no los tiene — ver front/lib/permisos.ts.

function supervisorSession() {
  return {
    userId: 1,
    rol: 'supervisor' as const,
    codigoEmpleado: 'SUP001',
    nombreCompleto: 'Ana Sup',
    accessToken: 'token-123',
    refreshToken: 'refresh-123',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  }
}

function capturacionSession() {
  return { ...supervisorSession(), rol: 'capturacion' as const }
}

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value)
  }
  return fd
}

// ─── registrarMuestreoDetalleInformalAction ────────────────────────────────────

describe('registrarMuestreoDetalleInformalAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin sesión → { ok: false, error: "No autorizado" }', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const fd = makeFormData({ reportId: '1', item_id: '1', defects: '0' })

    const result = await registrarMuestreoDetalleInformalAction({}, fd)
    expect(result).toEqual({ ok: false, error: 'No autorizado' })
  })

  it('rol capturacion (solo lectura) → { ok: false, error: "No autorizado" }', async () => {
    vi.mocked(getSession).mockResolvedValue(capturacionSession())
    const fd = makeFormData({ reportId: '1', item_id: '1', defects: '0' })

    const result = await registrarMuestreoDetalleInformalAction({}, fd)
    expect(result).toEqual({ ok: false, error: 'No autorizado' })
    expect(registerSamplingDetalleInformal).not.toHaveBeenCalled()
  })

  it('reportId no numérico → error', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    const fd = makeFormData({ reportId: 'abc', item_id: '1', defects: '0' })

    const result = await registrarMuestreoDetalleInformalAction({}, fd)
    expect(result).toEqual({ ok: false, error: 'Reporte o ítem inválido' })
  })

  it('éxito aprobado → { ok: true, approved: true, itemId, message }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(registerSamplingDetalleInformal).mockResolvedValue({
      ok: true,
      approved: true,
      sampledPieces: 2,
      ng: 0,
      maxDefects: 1,
    })
    const fd = makeFormData({ reportId: '42', item_id: '7', defects: '0' })

    const result = await registrarMuestreoDetalleInformalAction({}, fd)
    expect(result).toEqual({ ok: true, approved: true, itemId: 7, message: 'Muestreo aprobado' })
  })

  it('éxito no aprobado → { ok: true, approved: false, message: "Muestreo NO aprobado" }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(registerSamplingDetalleInformal).mockResolvedValue({
      ok: true,
      approved: false,
      sampledPieces: 2,
      ng: 2,
      maxDefects: 1,
    })
    const fd = makeFormData({ reportId: '42', item_id: '7', defects: '2' })

    const result = await registrarMuestreoDetalleInformalAction({}, fd)
    expect(result).toEqual({ ok: true, approved: false, itemId: 7, message: 'Muestreo NO aprobado' })
  })

  it('qb_sync devuelve not_found → mensaje de error', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(registerSamplingDetalleInformal).mockResolvedValue({ ok: false, reason: 'not_found' })
    const fd = makeFormData({ reportId: '42', item_id: '7', defects: '0' })

    const result = await registrarMuestreoDetalleInformalAction({}, fd)
    expect(result).toEqual({ ok: false, error: 'Reporte no encontrado.' })
  })

  it('qb_sync devuelve invalid_status → mensaje de error', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(registerSamplingDetalleInformal).mockResolvedValue({ ok: false, reason: 'invalid_status' })
    const fd = makeFormData({ reportId: '42', item_id: '7', defects: '0' })

    const result = await registrarMuestreoDetalleInformalAction({}, fd)
    expect(result).toMatchObject({ error: expect.stringContaining('estado válido') })
  })
})

// ─── signInformalReporteAction ────────────────────────────────────────────────

describe('signInformalReporteAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin sesión → { error: "No autorizado" }', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const fd = makeFormData({ reportId: '1' })

    const result = await signInformalReporteAction({}, fd)
    expect(result).toMatchObject({ error: 'No autorizado' })
  })

  it('rol capturacion (solo lectura) → { error: "No autorizado" }', async () => {
    vi.mocked(getSession).mockResolvedValue(capturacionSession())
    const fd = makeFormData({ reportId: '1' })

    const result = await signInformalReporteAction({}, fd)
    expect(result).toMatchObject({ error: 'No autorizado' })
    expect(signInformalReporte).not.toHaveBeenCalled()
  })

  it('éxito → { ok: true }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(signInformalReporte).mockResolvedValue({ ok: true, status: 'signed' })
    const fd = makeFormData({ reportId: '10' })

    const result = await signInformalReporteAction({}, fd)
    expect(result).toEqual({ ok: true })
  })

  it('qb_sync not_found → mensaje de error', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(signInformalReporte).mockResolvedValue({ ok: false, reason: 'not_found' })
    const fd = makeFormData({ reportId: '10' })

    const result = await signInformalReporteAction({}, fd)
    expect(result).toMatchObject({ error: 'Reporte no encontrado' })
  })

  it('qb_sync invalid_status → mensaje sobre muestreo', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(signInformalReporte).mockResolvedValue({ ok: false, reason: 'invalid_status' })
    const fd = makeFormData({ reportId: '10' })

    const result = await signInformalReporteAction({}, fd)
    expect(result).toMatchObject({ error: expect.stringContaining('muestreo') })
  })
})
