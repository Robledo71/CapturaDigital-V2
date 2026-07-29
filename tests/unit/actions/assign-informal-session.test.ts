// tests/unit/actions/assign-informal-session.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/back/services/informalOrdersService', () => ({
  assignInformalSession: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { getSession } from '@/back/services/session'
import { assignInformalSession } from '@/back/services/informalOrdersService'
import { revalidatePath } from 'next/cache'
import { asignarSesionInformalAction } from '@/app/actions/assign-informal-session'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function baseSession(rol: string, empleadoId: number | null = 9, permisos?: string[]) {
  return {
    userId: 1,
    rol,
    codigoEmpleado: 'SUP001',
    nombreCompleto: 'Sup User',
    empleadoId,
    permisos,
    accessToken: 'sup-token',
    refreshToken: 'refresh-token',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  }
}

function validFormData(overrides: Record<string, string> = {}, inspectorIds: string[] = ['1', '2']): FormData {
  const defaults: Record<string, string> = { itemId: '10' }
  const fd = new FormData()
  const merged = { ...defaults, ...overrides }
  for (const [key, value] of Object.entries(merged)) {
    fd.append(key, value)
  }
  for (const id of inspectorIds) {
    fd.append('inspectorIds', id)
  }
  return fd
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('asignarSesionInformalAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin sesión → { ok: false, error }', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const result = await asignarSesionInformalAction(undefined, validFormData())
    expect(result).toMatchObject({ ok: false })
    expect(assignInformalSession).not.toHaveBeenCalled()
  })

  // El gate ahora es can(session, 'ordenes_informales.asignar') — que cae a la matriz
  // SEED de permisos.ts mientras qb_sync no entregue `permisos` en el JWT. 'admin' tiene
  // TODOS_LOS_PERMISOS ahí, así que queda autorizado en el frontend igual que antes; la
  // frontera real sigue siendo qb_sync (authorize(...ASIGNACION_ROLES) excluye 'admin').
  it.each(['superusuario', 'supervisor_regional', 'supervisor', 'lider', 'admin'])(
    'rol %s autorizado → llama al servicio',
    async (rol) => {
      vi.mocked(getSession).mockResolvedValue(baseSession(rol) as never)
      vi.mocked(assignInformalSession).mockResolvedValue({ ok: true })

      const result = await asignarSesionInformalAction(undefined, validFormData())
      expect(result).toEqual({ ok: true })
      expect(assignInformalSession).toHaveBeenCalledOnce()
    },
  )

  it.each(['capturacion', 'servicio_cliente', 'cliente', 'gerente'])(
    'rol %s NO autorizado → { ok: false, error: "No autorizado." }',
    async (rol) => {
      vi.mocked(getSession).mockResolvedValue(baseSession(rol) as never)

      const result = await asignarSesionInformalAction(undefined, validFormData())
      expect(result).toEqual({ ok: false, error: 'No autorizado.' })
      expect(assignInformalSession).not.toHaveBeenCalled()
    },
  )

  it('sesión con permisos efectivos explícitos sin ordenes_informales.asignar (JWT real de qb_sync) → NO autorizado', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor', 9, []) as never)

    const result = await asignarSesionInformalAction(undefined, validFormData())
    expect(result).toEqual({ ok: false, error: 'No autorizado.' })
    expect(assignInformalSession).not.toHaveBeenCalled()
  })

  it('itemId inválido → error, no llama al servicio', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor') as never)

    const result = await asignarSesionInformalAction(undefined, validFormData({ itemId: '0' }))
    expect(result).toMatchObject({ ok: false })
    expect(assignInformalSession).not.toHaveBeenCalled()
  })

  it('sin inspectorIds → error de selección', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor') as never)

    const result = await asignarSesionInformalAction(undefined, validFormData({}, []))
    expect(result).toEqual({ ok: false, error: 'Selecciona al menos un inspector.' })
    expect(assignInformalSession).not.toHaveBeenCalled()
  })

  it('sin empleadoId asociado → error, no llama al servicio', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor', null) as never)

    const result = await asignarSesionInformalAction(undefined, validFormData())
    expect(result).toEqual({ ok: false, error: 'Tu usuario no tiene empleado asociado.' })
    expect(assignInformalSession).not.toHaveBeenCalled()
  })

  it('llama al servicio con itemId, idSupervisor e idInspectores correctos', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor', 9) as never)
    vi.mocked(assignInformalSession).mockResolvedValue({ ok: true })

    await asignarSesionInformalAction(undefined, validFormData({ itemId: '10' }, ['1', '2']))

    expect(assignInformalSession).toHaveBeenCalledWith(
      10,
      { idSupervisor: '9', idInspectores: ['1', '2'] },
      'sup-token',
    )
  })

  it('asignación exitosa → revalida los 4 portales', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor') as never)
    vi.mocked(assignInformalSession).mockResolvedValue({ ok: true })

    await asignarSesionInformalAction(undefined, validFormData())

    expect(revalidatePath).toHaveBeenCalledWith('/supervisor/ordenes-informales')
    expect(revalidatePath).toHaveBeenCalledWith('/superusuario/ordenes-informales')
    expect(revalidatePath).toHaveBeenCalledWith('/servicio-cliente/ordenes-informales')
    expect(revalidatePath).toHaveBeenCalledWith('/capturacion/ordenes-informales')
  })

  it('error del servicio → propaga el mensaje de error', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor') as never)
    vi.mocked(assignInformalSession).mockResolvedValue({
      ok: false,
      error: 'El inspector ya tiene una sesión activa.',
    })

    const result = await asignarSesionInformalAction(undefined, validFormData())
    expect(result).toEqual({ ok: false, error: 'El inspector ya tiene una sesión activa.' })
  })

  it('error inesperado (excepción) → error genérico', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor') as never)
    vi.mocked(assignInformalSession).mockRejectedValue(new Error('network down'))

    const result = await asignarSesionInformalAction(undefined, validFormData())
    expect(result).toMatchObject({ ok: false })
  })
})
