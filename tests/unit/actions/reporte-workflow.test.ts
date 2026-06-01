// tests/unit/actions/reporte-workflow.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/back/services/reporteDetalleService', () => ({
  registerSamplingDecision: vi.fn(),
  signReporte: vi.fn(),
  publishReporte: vi.fn(),
}))

import { getSession } from '@/back/services/session'
import {
  registerSamplingDecision,
  signReporte,
  publishReporte,
} from '@/back/services/reporteDetalleService'
import {
  registerSamplingAction,
  signReporteAction,
  publishReporteAction,
} from '@/app/actions/reporte-workflow'

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── registerSamplingAction ───────────────────────────────────────────────────

describe('registerSamplingAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin sesión → { error: "No autorizado" }', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const fd = makeFormData({ reportId: '1', decision: 'approve' })

    const result = await registerSamplingAction({}, fd)
    expect(result).toMatchObject({ error: 'No autorizado' })
  })

  it('rol capturacion → { error: "No autorizado" }', async () => {
    vi.mocked(getSession).mockResolvedValue(capturacionSession())
    const fd = makeFormData({ reportId: '1', decision: 'approve' })

    const result = await registerSamplingAction({}, fd)
    expect(result).toMatchObject({ error: 'No autorizado' })
  })

  it('reportId no numérico → { error: "Reporte requerido" }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    const fd = makeFormData({ reportId: 'abc', decision: 'approve' })

    const result = await registerSamplingAction({}, fd)
    expect(result).toMatchObject({ error: 'Reporte requerido' })
  })

  it('decisión inválida → error de decisión', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    const fd = makeFormData({ reportId: '5', decision: 'invalid' })

    const result = await registerSamplingAction({}, fd)
    expect(result).toMatchObject({ error: 'Decisión de muestreo inválida' })
  })

  it('éxito → { ok: true }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(registerSamplingDecision).mockResolvedValue({ ok: true, status: 'sampling' })
    const fd = makeFormData({ reportId: '42', decision: 'approve' })

    const result = await registerSamplingAction({}, fd)
    expect(result).toEqual({ ok: true })
  })

  it('qb_sync devuelve error → devuelve el mensaje de error', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(registerSamplingDecision).mockResolvedValue({ ok: false, reason: 'not_found' })
    const fd = makeFormData({ reportId: '42', decision: 'approve' })

    const result = await registerSamplingAction({}, fd)
    expect(result).toMatchObject({ error: 'Reporte no encontrado' })
  })

  it('qb_sync devuelve rule_failed → devuelve mensaje AQL', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(registerSamplingDecision).mockResolvedValue({ ok: false, reason: 'rule_failed' })
    const fd = makeFormData({ reportId: '42', decision: 'reject' })

    const result = await registerSamplingAction({}, fd)
    expect(result).toMatchObject({ error: expect.stringContaining('AQL') })
  })
})

// ─── signReporteAction ────────────────────────────────────────────────────────

describe('signReporteAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin sesión → { error: "No autorizado" }', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const fd = makeFormData({ reportId: '1' })

    const result = await signReporteAction({}, fd)
    expect(result).toMatchObject({ error: 'No autorizado' })
  })

  it('rol capturacion → { error: "No autorizado" }', async () => {
    vi.mocked(getSession).mockResolvedValue(capturacionSession())
    const fd = makeFormData({ reportId: '1' })

    const result = await signReporteAction({}, fd)
    expect(result).toMatchObject({ error: 'No autorizado' })
  })

  it('éxito → { ok: true }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(signReporte).mockResolvedValue({ ok: true, status: 'signed' })
    const fd = makeFormData({ reportId: '10' })

    const result = await signReporteAction({}, fd)
    expect(result).toEqual({ ok: true })
  })

  it('qb_sync not_found → mensaje de error', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(signReporte).mockResolvedValue({ ok: false, reason: 'not_found' })
    const fd = makeFormData({ reportId: '10' })

    const result = await signReporteAction({}, fd)
    expect(result).toMatchObject({ error: 'Reporte no encontrado' })
  })

  it('qb_sync invalid_status → mensaje sobre muestreo', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(signReporte).mockResolvedValue({ ok: false, reason: 'invalid_status' })
    const fd = makeFormData({ reportId: '10' })

    const result = await signReporteAction({}, fd)
    expect(result).toMatchObject({ error: expect.stringContaining('muestreo') })
  })
})

// ─── publishReporteAction ─────────────────────────────────────────────────────

describe('publishReporteAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin sesión → { error: "No autorizado" }', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const fd = makeFormData({ reportId: '1' })

    const result = await publishReporteAction({}, fd)
    expect(result).toMatchObject({ error: 'No autorizado' })
  })

  it('rol capturacion → { error: "No autorizado" }', async () => {
    vi.mocked(getSession).mockResolvedValue(capturacionSession())
    const fd = makeFormData({ reportId: '1' })

    const result = await publishReporteAction({}, fd)
    expect(result).toMatchObject({ error: 'No autorizado' })
  })

  it('éxito → { ok: true }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(publishReporte).mockResolvedValue({ ok: true, status: 'published' })
    const fd = makeFormData({ reportId: '20' })

    const result = await publishReporteAction({}, fd)
    expect(result).toEqual({ ok: true })
  })

  it('qb_sync not_found → mensaje de error', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(publishReporte).mockResolvedValue({ ok: false, reason: 'not_found' })
    const fd = makeFormData({ reportId: '20' })

    const result = await publishReporteAction({}, fd)
    expect(result).toMatchObject({ error: 'Reporte no encontrado' })
  })

  it('qb_sync invalid_status → mensaje sobre firma', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(publishReporte).mockResolvedValue({ ok: false, reason: 'invalid_status' })
    const fd = makeFormData({ reportId: '20' })

    const result = await publishReporteAction({}, fd)
    expect(result).toMatchObject({ error: expect.stringContaining('firma') })
  })
})
