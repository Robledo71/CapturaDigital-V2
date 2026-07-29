// tests/unit/actions/update-inspector.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/back/services/inspectorService', () => ({
  updateInspectorName: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { getSession } from '@/back/services/session'
import { updateInspectorName } from '@/back/services/inspectorService'
import { revalidatePath } from 'next/cache'
import { editarInspectorAction } from '@/app/actions/update-inspector'

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

function validFormData(overrides: Record<string, string> = {}): FormData {
  const defaults: Record<string, string> = {
    empleadoId: '1',
    nombre_empleado: 'Juan',
    apellido_paterno: 'Perez',
    apellido_materno: 'Lopez',
  }
  const fd = new FormData()
  const merged = { ...defaults, ...overrides }
  for (const [key, value] of Object.entries(merged)) {
    fd.append(key, value)
  }
  return fd
}

function makeInspectorRow() {
  return {
    empleadoId: 1,
    codigoUsuario: 'INS-001',
    nombreEmpleado: 'Juan',
    apellidoPaterno: 'Perez',
    apellidoMaterno: 'Lopez',
    nombreCompleto: 'Juan Perez Lopez',
    plantas: [{ id: 1, nombre: 'Planta Norte' }],
    activo: true,
  }
}

describe('editarInspectorAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin sesión → { ok: false, error }', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const result = await editarInspectorAction(undefined, validFormData())
    expect(result).toMatchObject({ ok: false })
    expect(updateInspectorName).not.toHaveBeenCalled()
  })

  it('rol no autorizado (admin) → { ok: false, error: "No autorizado." }', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('admin') as never)

    const result = await editarInspectorAction(undefined, validFormData())
    expect(result).toEqual({ ok: false, error: 'No autorizado.' })
    expect(updateInspectorName).not.toHaveBeenCalled()
  })

  it('rol lider autorizado → llama al servicio', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('lider') as never)
    vi.mocked(updateInspectorName).mockResolvedValue({ ok: true, inspector: makeInspectorRow() })

    const result = await editarInspectorAction(undefined, validFormData())
    expect(result).toMatchObject({ ok: true })
    expect(updateInspectorName).toHaveBeenCalledWith(
      1,
      { nombreEmpleado: 'Juan', apellidoPaterno: 'Perez', apellidoMaterno: 'Lopez' },
      'sup-token',
    )
  })

  it('nombre vacío → error de validación, no llama al servicio', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor') as never)

    const result = await editarInspectorAction(undefined, validFormData({ nombre_empleado: '' }))
    expect(result).toMatchObject({ ok: false })
    expect(updateInspectorName).not.toHaveBeenCalled()
  })

  it('actualización exitosa → revalida ambos portales', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor') as never)
    vi.mocked(updateInspectorName).mockResolvedValue({ ok: true, inspector: makeInspectorRow() })

    const result = await editarInspectorAction(undefined, validFormData())

    expect(result).toEqual({ ok: true, inspector: makeInspectorRow() })
    expect(revalidatePath).toHaveBeenCalledWith('/supervisor/inspectores')
    expect(revalidatePath).toHaveBeenCalledWith('/superusuario/inspectores')
  })

  it('not_found → { ok: false, error }', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor') as never)
    vi.mocked(updateInspectorName).mockResolvedValue({
      ok: false,
      reason: 'not_found',
      error: 'El inspector no existe.',
    })

    const result = await editarInspectorAction(undefined, validFormData())
    expect(result).toEqual({ ok: false, error: 'El inspector no existe.' })
  })

  it('forbidden (otra planta) → { ok: false, error }', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor') as never)
    vi.mocked(updateInspectorName).mockResolvedValue({
      ok: false,
      reason: 'forbidden',
      error: 'No tienes permiso para editar este inspector.',
    })

    const result = await editarInspectorAction(undefined, validFormData())
    expect(result).toEqual({ ok: false, error: 'No tienes permiso para editar este inspector.' })
  })

  it('error inesperado del servicio → error general', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor') as never)
    vi.mocked(updateInspectorName).mockRejectedValue(new Error('network down'))

    const result = await editarInspectorAction(undefined, validFormData())
    expect(result).toMatchObject({ ok: false })
  })
})
