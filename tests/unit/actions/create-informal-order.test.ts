// tests/unit/actions/create-informal-order.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/back/services/informalOrdersService', () => ({
  createInformalOrder: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { getSession } from '@/back/services/session'
import { createInformalOrder } from '@/back/services/informalOrdersService'
import { revalidatePath } from 'next/cache'
import { crearOrdenInformalAction } from '@/app/actions/create-informal-order'

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

function validFormData(overrides: Record<string, string> = {}, inspectorIds: string[] = []): FormData {
  const defaults: Record<string, string> = {
    tipo_orden: 'OV',
    cliente_id: '5',
    numero_parte: '83600-3BH',
    nombre_parte: 'MAT SET FLOOR',
    planta_id: '2',
  }
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

describe('crearOrdenInformalAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin sesión → { ok: false, error }', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const result = await crearOrdenInformalAction(undefined, validFormData())
    expect(result).toMatchObject({ ok: false })
    expect(createInformalOrder).not.toHaveBeenCalled()
  })

  // El gate ahora es can(session, 'ordenes_informales.crear') — que, mientras qb_sync
  // no entregue `permisos` en el JWT, cae a la matriz SEED de permisos.ts. 'admin' tiene
  // TODOS_LOS_PERMISOS ahí (acceso total), así que queda autorizado igual que antes de
  // esta migración pasaba solo por rol explícito. La frontera real sigue siendo el
  // backend (authorize(...ASIGNACION_ROLES) en qb_sync excluye 'admin' de esta ruta).
  it.each(['superusuario', 'supervisor_regional', 'supervisor', 'lider', 'admin'])(
    'rol %s autorizado → llama al servicio',
    async (rol) => {
      vi.mocked(getSession).mockResolvedValue(baseSession(rol) as never)
      vi.mocked(createInformalOrder).mockResolvedValue({ ok: true, data: {} })

      const result = await crearOrdenInformalAction(undefined, validFormData())
      expect(result).toEqual({ ok: true })
      expect(createInformalOrder).toHaveBeenCalledOnce()
    },
  )

  it.each(['capturacion', 'servicio_cliente', 'cliente', 'gerente'])(
    'rol %s NO autorizado → { ok: false, error: "No autorizado." }',
    async (rol) => {
      vi.mocked(getSession).mockResolvedValue(baseSession(rol) as never)

      const result = await crearOrdenInformalAction(undefined, validFormData())
      expect(result).toEqual({ ok: false, error: 'No autorizado.' })
      expect(createInformalOrder).not.toHaveBeenCalled()
    },
  )

  it('sesión con permisos efectivos explícitos sin ordenes_informales.crear (JWT real de qb_sync) → NO autorizado', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor', 9, []) as never)

    const result = await crearOrdenInformalAction(undefined, validFormData())
    expect(result).toEqual({ ok: false, error: 'No autorizado.' })
    expect(createInformalOrder).not.toHaveBeenCalled()
  })

  it('numero_parte vacío → error de validación, no llama al servicio', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor') as never)

    const result = await crearOrdenInformalAction(undefined, validFormData({ numero_parte: '' }))
    expect(result).toMatchObject({ ok: false })
    expect(createInformalOrder).not.toHaveBeenCalled()
  })

  it('cliente_id inválido → error de validación', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor') as never)

    const result = await crearOrdenInformalAction(undefined, validFormData({ cliente_id: '0' }))
    expect(result).toMatchObject({ ok: false })
    expect(createInformalOrder).not.toHaveBeenCalled()
  })

  it('tipo_orden inválido → error de validación', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor') as never)

    const result = await crearOrdenInformalAction(undefined, validFormData({ tipo_orden: 'XX' }))
    expect(result).toMatchObject({ ok: false })
    expect(createInformalOrder).not.toHaveBeenCalled()
  })

  it('creación exitosa sin inspectores → { ok: true } y revalida los 4 portales', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor') as never)
    vi.mocked(createInformalOrder).mockResolvedValue({ ok: true, data: {} })

    const result = await crearOrdenInformalAction(undefined, validFormData())

    expect(result).toEqual({ ok: true })
    expect(revalidatePath).toHaveBeenCalledWith('/supervisor/ordenes-informales')
    expect(revalidatePath).toHaveBeenCalledWith('/superusuario/ordenes-informales')
    expect(revalidatePath).toHaveBeenCalledWith('/servicio-cliente/ordenes-informales')
    expect(revalidatePath).toHaveBeenCalledWith('/capturacion/ordenes-informales')

    const payload = vi.mocked(createInformalOrder).mock.calls[0][0]
    expect(payload).not.toHaveProperty('inspectionSession')
  })

  it('con inspectorIds → incluye inspectionSession con el empleadoId del supervisor logueado', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor', 9) as never)
    vi.mocked(createInformalOrder).mockResolvedValue({ ok: true, data: {} })

    await crearOrdenInformalAction(undefined, validFormData({}, ['1', '2']))

    const payload = vi.mocked(createInformalOrder).mock.calls[0][0]
    expect(payload.inspectionSession).toEqual({ idSupervisor: '9', idInspectores: ['1', '2'] })
  })

  it('con inspectorIds pero sin empleadoId asociado → error, no llama al servicio', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor', null) as never)

    const result = await crearOrdenInformalAction(undefined, validFormData({}, ['1']))
    expect(result).toEqual({ ok: false, error: 'Tu usuario no tiene empleado asociado.' })
    expect(createInformalOrder).not.toHaveBeenCalled()
  })

  it('error del servicio → propaga el mensaje de error', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor') as never)
    vi.mocked(createInformalOrder).mockResolvedValue({ ok: false, error: 'Conflicto al crear la orden informal.' })

    const result = await crearOrdenInformalAction(undefined, validFormData())
    expect(result).toEqual({ ok: false, error: 'Conflicto al crear la orden informal.' })
  })

  it('error inesperado (excepción) → error genérico', async () => {
    vi.mocked(getSession).mockResolvedValue(baseSession('supervisor') as never)
    vi.mocked(createInformalOrder).mockRejectedValue(new Error('network down'))

    const result = await crearOrdenInformalAction(undefined, validFormData())
    expect(result).toMatchObject({ ok: false })
  })
})
