// tests/unit/actions/update-informal-report-item.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/back/services/informalReportesService', () => ({
  updateInformalReportItem: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { getSession } from '@/back/services/session'
import { updateInformalReportItem } from '@/back/services/informalReportesService'
import { updateInformalReportItemAction } from '@/app/actions/update-informal-report-item'

// ─── Helpers ─────────────────────────────────────────────────────────────────
// supervisor tiene reportes_informales.editar en la matriz SEED; capturacion
// (solo lectura) no lo tiene — ver front/lib/permisos.ts.

function supervisorSession() {
  return {
    userId: 1,
    rol: 'supervisor' as const,
    codigoEmpleado: 'SUP001',
    nombreCompleto: 'Supervisor Test',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
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

describe('updateInformalReportItemAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin sesión → { ok: false, error: "No autorizado" }', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const fd = makeFormData({ reportId: '1', itemId: '1' })

    const result = await updateInformalReportItemAction(undefined, fd)
    expect(result).toEqual({ ok: false, error: 'No autorizado' })
    expect(updateInformalReportItem).not.toHaveBeenCalled()
  })

  it('rol capturacion (solo lectura) → { ok: false, error: "No autorizado" }', async () => {
    vi.mocked(getSession).mockResolvedValue(capturacionSession())
    const fd = makeFormData({ reportId: '1', itemId: '1', ok: '50', ng: '5', total: '55', motivo: 'x' })

    const result = await updateInformalReportItemAction(undefined, fd)
    expect(result).toEqual({ ok: false, error: 'No autorizado' })
    expect(updateInformalReportItem).not.toHaveBeenCalled()
  })

  it('reportId no numérico → { ok: false, error: "Datos inválidos" }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    const fd = makeFormData({ reportId: 'abc', itemId: '1', ok: '50', ng: '5', total: '55' })

    const result = await updateInformalReportItemAction(undefined, fd)
    expect(result).toEqual({ ok: false, error: 'Datos inválidos' })
  })

  it('sin motivo → { ok: false, error: "El motivo de edición es obligatorio." }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    const fd = makeFormData({ reportId: '1', itemId: '1', ok: '50', ng: '5', total: '55' })

    const result = await updateInformalReportItemAction(undefined, fd)
    expect(result).toEqual({ ok: false, error: 'El motivo de edición es obligatorio.' })
  })

  it('suma de piezas válida (ok + ng = total) → éxito y llama al servicio con los valores correctos', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(updateInformalReportItem).mockResolvedValue({ ok: true })

    const fd = makeFormData({
      reportId: '10',
      itemId: '5',
      ok: '90',
      ng: '10',
      recovered: '3',
      total: '100',
      incidents: '[]',
      motivo: 'Corrección de conteo por error del operador',
    })

    const result = await updateInformalReportItemAction(undefined, fd)
    expect(result).toEqual({ ok: true })

    expect(updateInformalReportItem).toHaveBeenCalledWith({
      reportId: 10,
      itemId: 5,
      accessToken: 'access-token',
      lote: null,
      serie: null,
      identificadores: null,
      totalPieces: 100,
      okPieces: 90,
      ngPieces: 10,
      scrapPieces: 7, // ng - recovered
      recoveredPieces: 3,
      incidents: [],
      motivo: 'Corrección de conteo por error del operador',
    })
  })

  it('recovered se clampea a ng (no puede superar ng)', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(updateInformalReportItem).mockResolvedValue({ ok: true })

    const fd = makeFormData({
      reportId: '1',
      itemId: '1',
      ok: '80',
      ng: '5',
      recovered: '10', // más que ng
      total: '85',
      motivo: 'Re-clasificación de piezas recuperadas',
    })

    await updateInformalReportItemAction(undefined, fd)

    const payload = vi.mocked(updateInformalReportItem).mock.calls[0][0]
    expect(payload.recoveredPieces).toBe(5) // clamped to ng
    expect(payload.scrapPieces).toBe(0)
  })

  it('qb_sync devuelve error → { ok: false, error: mensaje }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(updateInformalReportItem).mockResolvedValue({ ok: false, error: 'Solo se pueden editar ítems de reportes en estado enviado.' })

    const fd = makeFormData({
      reportId: '10',
      itemId: '99',
      ok: '50',
      ng: '5',
      total: '55',
      motivo: 'Ajuste por revisión de calidad',
    })

    const result = await updateInformalReportItemAction(undefined, fd)
    expect(result).toEqual({ ok: false, error: 'Solo se pueden editar ítems de reportes en estado enviado.' })
  })

  it('incidents inválido (JSON corrupto) → se ignora y se envía arreglo vacío', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(updateInformalReportItem).mockResolvedValue({ ok: true })

    const fd = makeFormData({
      reportId: '1',
      itemId: '1',
      ok: '0',
      ng: '0',
      total: '0',
      incidents: '{not-json',
      motivo: 'Error de sistema',
    })

    await updateInformalReportItemAction(undefined, fd)
    const payload = vi.mocked(updateInformalReportItem).mock.calls[0][0]
    expect(payload.incidents).toEqual([])
  })
})
