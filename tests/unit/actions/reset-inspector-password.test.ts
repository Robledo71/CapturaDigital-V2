// tests/unit/actions/reset-inspector-password.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/back/services/inspectorService', () => ({
  resetInspectorPassword: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { getSession } from '@/back/services/session'
import { resetInspectorPassword } from '@/back/services/inspectorService'
import { revalidatePath } from 'next/cache'
import { resetInspectorPasswordAction } from '@/app/actions/reset-inspector-password'

function baseSession(rol: string) {
  return {
    userId: 1,
    rol,
    codigoEmpleado: 'SUP001',
    nombreCompleto: 'Sup User',
    accessToken: 'sup-token',
    refreshToken: 'refresh-token',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  }
}

function formDataWith(empleadoId: string): FormData {
  const fd = new FormData()
  fd.set('empleadoId', empleadoId)
  return fd
}

describe('resetInspectorPasswordAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin sesión → { ok: false, error }', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const result = await resetInspectorPasswordAction(undefined, formDataWith('1'))
    expect(result).toMatchObject({ ok: false })
    expect(resetInspectorPassword).not.toHaveBeenCalled()
  })

  it('rol no autorizado (cliente) → { ok: false, error: "No autorizado." }', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('cliente') as never)

    const result = await resetInspectorPasswordAction(undefined, formDataWith('1'))
    expect(result).toEqual({ ok: false, error: 'No autorizado.' })
    expect(resetInspectorPassword).not.toHaveBeenCalled()
  })

  it('rol supervisor_regional autorizado → llama al servicio', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor_regional') as never)
    vi.mocked(resetInspectorPassword).mockResolvedValue({ ok: true, generatedPassword: 'NewPass123' })

    const result = await resetInspectorPasswordAction(undefined, formDataWith('1'))
    expect(result).toEqual({ ok: true, generatedPassword: 'NewPass123' })
    expect(resetInspectorPassword).toHaveBeenCalledWith(1, 'sup-token')
  })

  it('empleadoId inválido → { ok: false, error }, no llama al servicio', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor') as never)

    const result = await resetInspectorPasswordAction(undefined, formDataWith(''))
    expect(result).toMatchObject({ ok: false })
    expect(resetInspectorPassword).not.toHaveBeenCalled()
  })

  it('reseteo exitoso → revalida ambos portales', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor') as never)
    vi.mocked(resetInspectorPassword).mockResolvedValue({ ok: true, generatedPassword: 'NewPass123' })

    await resetInspectorPasswordAction(undefined, formDataWith('1'))

    expect(revalidatePath).toHaveBeenCalledWith('/supervisor/inspectores')
    expect(revalidatePath).toHaveBeenCalledWith('/superusuario/inspectores')
  })

  it('servicio devuelve error (403/404) → se pasa tal cual', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor') as never)
    vi.mocked(resetInspectorPassword).mockResolvedValue({
      ok: false,
      error: 'No tienes permiso para resetear la contraseña de este inspector.',
    })

    const result = await resetInspectorPasswordAction(undefined, formDataWith('1'))
    expect(result).toEqual({
      ok: false,
      error: 'No tienes permiso para resetear la contraseña de este inspector.',
    })
  })

  it('error inesperado del servicio → error general', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor') as never)
    vi.mocked(resetInspectorPassword).mockRejectedValue(new Error('network down'))

    const result = await resetInspectorPasswordAction(undefined, formDataWith('1'))
    expect(result).toMatchObject({ ok: false })
  })
})
