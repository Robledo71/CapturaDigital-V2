// tests/unit/actions/create-inspector.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/back/services/inspectorService', () => ({
  createInspector: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { getSession } from '@/back/services/session'
import { createInspector } from '@/back/services/inspectorService'
import { revalidatePath } from 'next/cache'
import { crearInspectorAction } from '@/app/actions/create-inspector'

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function validFormData(overrides: Record<string, string> = {}, plantaIds: string[] = ['1']): FormData {
  const defaults: Record<string, string> = {
    codigo_empleado: 'INS-001',
    nombre_empleado: 'Juan',
    apellido_paterno: 'Perez',
    apellido_materno: 'Lopez',
  }
  const fd = new FormData()
  const merged = { ...defaults, ...overrides }
  for (const [key, value] of Object.entries(merged)) {
    fd.append(key, value)
  }
  for (const id of plantaIds) {
    fd.append('plantaIds', id)
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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('crearInspectorAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin sesión → { ok: false, error }', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const result = await crearInspectorAction(undefined, validFormData())
    expect(result).toMatchObject({ ok: false })
    expect(createInspector).not.toHaveBeenCalled()
  })

  it.each(['superusuario', 'supervisor_regional', 'supervisor', 'lider'])(
    'rol %s autorizado → llama al servicio',
    async (rol) => {
      vi.mocked(getSession).mockResolvedValue(baseSession(rol) as never)
      vi.mocked(createInspector).mockResolvedValue({
        ok: true,
        inspector: makeInspectorRow(),
        generatedPassword: 'Ab12Cd34',
      })

      const result = await crearInspectorAction(undefined, validFormData())
      expect(result).toMatchObject({ ok: true })
      expect(createInspector).toHaveBeenCalledOnce()
    },
  )

  // admin sí está autorizado a crear inspectores desde su portal (ver create-inspector.ts ALLOWED_ROLES).
  it.each(['capturacion', 'servicio_cliente', 'cliente', 'gerente'])(
    'rol %s NO autorizado → { ok: false, error: "No autorizado." }',
    async (rol) => {
      vi.mocked(getSession).mockResolvedValue(baseSession(rol) as never)

      const result = await crearInspectorAction(undefined, validFormData())
      expect(result).toEqual({ ok: false, error: 'No autorizado.' })
      expect(createInspector).not.toHaveBeenCalled()
    },
  )

  // El código de empleado ya no se captura ni valida en el form: lo autogenera el
  // backend (INS-00x). Por eso ya no hay test de "código vacío → error".

  it('creación exitosa → { ok: true, generatedPassword, inspector } y revalida ambos portales', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor') as never)
    vi.mocked(createInspector).mockResolvedValue({
      ok: true,
      inspector: makeInspectorRow(),
      generatedPassword: 'Ab12Cd34',
    })

    const result = await crearInspectorAction(undefined, validFormData())

    expect(result).toEqual({ ok: true, generatedPassword: 'Ab12Cd34', inspector: makeInspectorRow() })
    expect(revalidatePath).toHaveBeenCalledWith('/supervisor/inspectores')
    expect(revalidatePath).toHaveBeenCalledWith('/superusuario/inspectores')
  })

  it('límite alcanzado → { ok: false, error } amigable', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor') as never)
    vi.mocked(createInspector).mockResolvedValue({
      ok: false,
      reason: 'limit',
      error: 'Se alcanzó el límite de 50 cuentas de inspector.',
    })

    const result = await crearInspectorAction(undefined, validFormData())
    expect(result).toEqual({ ok: false, error: 'Se alcanzó el límite de 50 cuentas de inspector.' })
  })

  it('código duplicado → { ok: false, error } amigable', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor') as never)
    vi.mocked(createInspector).mockResolvedValue({
      ok: false,
      reason: 'duplicate_codigo',
      error: 'Ya existe un usuario con ese código.',
    })

    const result = await crearInspectorAction(undefined, validFormData())
    expect(result).toEqual({ ok: false, error: 'Ya existe un usuario con ese código.' })
  })

  it('error inesperado del servicio → error general', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor') as never)
    vi.mocked(createInspector).mockRejectedValue(new Error('network down'))

    const result = await crearInspectorAction(undefined, validFormData())
    expect(result).toMatchObject({ ok: false })
  })

  it('múltiples plantaIds → se pasan como arreglo de números al servicio', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor') as never)
    vi.mocked(createInspector).mockResolvedValue({
      ok: true,
      inspector: makeInspectorRow(),
      generatedPassword: 'x',
    })

    await crearInspectorAction(undefined, validFormData({}, ['1', '2', '3']))

    expect(vi.mocked(createInspector).mock.calls[0][0]).toMatchObject({ plantaIds: [1, 2, 3] })
  })
})
