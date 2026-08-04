// tests/unit/actions/desasignar-inspector.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/back/services/inspectionSessionService', () => ({
  desasignarInspector: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { getSession } from '@/back/services/session'
import { desasignarInspector } from '@/back/services/inspectionSessionService'
import { revalidatePath } from 'next/cache'
import { desasignarInspectorAction } from '@/app/actions/desasignar-inspector'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<{
  rol: 'supervisor' | 'admin' | 'capturacion'
}> = {}) {
  return {
    userId: 1,
    rol: 'supervisor' as const,
    codigoEmpleado: 'SUP001',
    nombreCompleto: 'Supervisor Test',
    empleadoId: 9,
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    ...overrides,
  }
}

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.append(key, value)
  return fd
}

function validForm(overrides: Record<string, string> = {}) {
  return makeFormData({
    orderItemId: '42',
    empleadoId: '16',
    ...overrides,
  })
}

describe('desasignarInspectorAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Autenticación y autorización ──────────────────────────────────────────

  it('sin sesión → error de expiración', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const result = await desasignarInspectorAction(undefined, validForm())
    expect(result).toEqual({ ok: false, error: 'Sesión expirada. Por favor inicia sesión nuevamente.' })
    expect(desasignarInspector).not.toHaveBeenCalled()
  })

  it('rol capturacion (sin ordenes.asignar) → no autorizado', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession({ rol: 'capturacion' }) as never)
    const result = await desasignarInspectorAction(undefined, validForm())
    expect(result).toEqual({ ok: false, error: 'No autorizado.' })
    expect(desasignarInspector).not.toHaveBeenCalled()
  })

  // ── Validación de datos ────────────────────────────────────────────────────

  it('orderItemId ausente → datos incompletos', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const result = await desasignarInspectorAction(undefined, validForm({ orderItemId: '' }))
    expect(result).toEqual({ ok: false, error: 'Datos incompletos.' })
    expect(desasignarInspector).not.toHaveBeenCalled()
  })

  it('empleadoId ausente → datos incompletos', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const result = await desasignarInspectorAction(undefined, validForm({ empleadoId: '' }))
    expect(result).toEqual({ ok: false, error: 'Datos incompletos.' })
    expect(desasignarInspector).not.toHaveBeenCalled()
  })

  it('orderItemId <= 0 → datos incompletos', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const result = await desasignarInspectorAction(undefined, validForm({ orderItemId: '0' }))
    expect(result).toEqual({ ok: false, error: 'Datos incompletos.' })
    expect(desasignarInspector).not.toHaveBeenCalled()
  })

  it('empleadoId no numérico → datos incompletos', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const result = await desasignarInspectorAction(undefined, validForm({ empleadoId: 'abc' }))
    expect(result).toEqual({ ok: false, error: 'Datos incompletos.' })
    expect(desasignarInspector).not.toHaveBeenCalled()
  })

  // ── Delegación al service ──────────────────────────────────────────────────

  it('datos válidos → llama a desasignarInspector con orderItemId, empleadoId y el token', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(desasignarInspector).mockResolvedValue({ ok: true })

    const result = await desasignarInspectorAction(undefined, validForm())

    expect(desasignarInspector).toHaveBeenCalledWith(42, 16, 'access-token-123')
    expect(result).toEqual({ ok: true })
  })

  it('éxito → revalida las rutas de carga de trabajo', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(desasignarInspector).mockResolvedValue({ ok: true })

    await desasignarInspectorAction(undefined, validForm())

    expect(revalidatePath).toHaveBeenCalledWith('/supervisor/carga-trabajo')
    expect(revalidatePath).toHaveBeenCalledWith('/superusuario/carga-trabajo')
  })

  it('el service devuelve error → se propaga tal cual y no se revalida', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(desasignarInspector).mockResolvedValue({ ok: false, error: 'No se pudo desasignar al inspector.' })

    const result = await desasignarInspectorAction(undefined, validForm())

    expect(result).toEqual({ ok: false, error: 'No se pudo desasignar al inspector.' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
