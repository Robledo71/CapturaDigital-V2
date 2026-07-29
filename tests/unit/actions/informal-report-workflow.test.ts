// tests/unit/actions/informal-report-workflow.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/back/services/informalReportesService', () => ({
  registerInformalSamplingDecision: vi.fn(),
  signInformalReporte: vi.fn(),
}))

import { getSession } from '@/back/services/session'
import {
  registerInformalSamplingDecision,
  signInformalReporte,
} from '@/back/services/informalReportesService'
import {
  registerInformalSamplingAction,
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

// ─── registerInformalSamplingAction ───────────────────────────────────────────

describe('registerInformalSamplingAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin sesión → { error: "No autorizado" }', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const fd = makeFormData({ reportId: '1', decision: 'approve' })

    const result = await registerInformalSamplingAction({}, fd)
    expect(result).toMatchObject({ error: 'No autorizado' })
  })

  it('rol capturacion (solo lectura) → { error: "No autorizado" }', async () => {
    vi.mocked(getSession).mockResolvedValue(capturacionSession())
    const fd = makeFormData({ reportId: '1', decision: 'approve' })

    const result = await registerInformalSamplingAction({}, fd)
    expect(result).toMatchObject({ error: 'No autorizado' })
    expect(registerInformalSamplingDecision).not.toHaveBeenCalled()
  })

  it('reportId no numérico → { error: "Reporte requerido" }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    const fd = makeFormData({ reportId: 'abc', decision: 'approve' })

    const result = await registerInformalSamplingAction({}, fd)
    expect(result).toMatchObject({ error: 'Reporte requerido' })
  })

  it('decisión inválida → error de decisión', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    const fd = makeFormData({ reportId: '5', decision: 'invalid' })

    const result = await registerInformalSamplingAction({}, fd)
    expect(result).toMatchObject({ error: 'Decisión de muestreo inválida' })
  })

  it('éxito → { ok: true }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(registerInformalSamplingDecision).mockResolvedValue({ ok: true, status: 'sampling' })
    const fd = makeFormData({ reportId: '42', decision: 'approve' })

    const result = await registerInformalSamplingAction({}, fd)
    expect(result).toEqual({ ok: true })
  })

  it('qb_sync devuelve error → devuelve el mensaje de error', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(registerInformalSamplingDecision).mockResolvedValue({ ok: false, reason: 'not_found' })
    const fd = makeFormData({ reportId: '42', decision: 'approve' })

    const result = await registerInformalSamplingAction({}, fd)
    expect(result).toMatchObject({ error: 'Reporte no encontrado' })
  })

  it('qb_sync devuelve rule_failed → devuelve mensaje AQL', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(registerInformalSamplingDecision).mockResolvedValue({ ok: false, reason: 'rule_failed' })
    const fd = makeFormData({ reportId: '42', decision: 'reject' })

    const result = await registerInformalSamplingAction({}, fd)
    expect(result).toMatchObject({ error: expect.stringContaining('AQL') })
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
