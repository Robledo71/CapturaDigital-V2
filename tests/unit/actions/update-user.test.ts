import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/back/services/session', () => ({ getSession: vi.fn() }))
vi.mock('@/back/services/userService', () => ({ updateUsuario: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { getSession } from '@/back/services/session'
import { updateUsuario } from '@/back/services/userService'
import { updateUser } from '@/app/actions/update-user'

const makeSession = () => ({
  userId: 1, rol: 'admin' as const, codigoEmpleado: 'ADM001',
  nombreCompleto: 'Admin', accessToken: 'tok', refreshToken: 'ref',
  plantaId: null, plantaNombre: null,
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
})

const makeFormData = (fields: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  return fd
}

const validFields = {
  id: '5', nombreCompleto: 'Ana García', codigoEmpleado: 'S-010',
  puesto: 'Supervisora', plantaId: '3', rol: 'supervisor', correo: 'ana@qb.mx',
}

const mockUsuario = { id: 5, nombreCompleto: 'Ana García', codigoEmpleado: 'S-010', isActive: true } as never

describe('updateUser', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('sin sesión → { errors: { general: ["No autorizado"] } }', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await updateUser(undefined, makeFormData(validFields))
    expect(res?.errors?.general?.[0]).toBe('No autorizado')
  })

  it('rol supervisor → no autorizado', async () => {
    vi.mocked(getSession).mockResolvedValue({ ...makeSession(), rol: 'supervisor' } as never)
    const res = await updateUser(undefined, makeFormData(validFields))
    expect(res?.errors?.general?.[0]).toBe('No autorizado')
  })

  it('id inválido (NaN) → { errors: { general: ["ID de usuario requerido"] } }', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const res = await updateUser(undefined, makeFormData({ ...validFields, id: 'abc' }))
    expect(res?.errors?.general?.[0]).toMatch(/ID de usuario requerido/i)
  })

  it('nombre vacío → error Zod en nombreCompleto', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const res = await updateUser(undefined, makeFormData({ ...validFields, nombreCompleto: '' }))
    expect(res?.errors?.nombreCompleto).toBeDefined()
  })

  it('correo inválido → error Zod en correo', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const res = await updateUser(undefined, makeFormData({ ...validFields, correo: 'no-es-correo' }))
    expect(res?.errors?.correo).toBeDefined()
  })

  it('rol inválido → error Zod en rol', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const res = await updateUser(undefined, makeFormData({ ...validFields, rol: 'inspector' }))
    expect(res?.errors?.rol).toBeDefined()
  })

  it('actualización exitosa → { success: true, usuario }', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(updateUsuario).mockResolvedValue({ ok: true, usuario: mockUsuario } as never)
    const res = await updateUser(undefined, makeFormData(validFields))
    expect(res?.success).toBe(true)
    expect(res?.usuario).toBeDefined()
  })

  it('duplicado de código → error en codigoEmpleado', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(updateUsuario).mockResolvedValue({ ok: false, reason: 'duplicate_codigo' } as never)
    const res = await updateUser(undefined, makeFormData(validFields))
    expect(res?.errors?.codigoEmpleado?.[0]).toMatch(/código/i)
  })

  it('duplicado de correo → error en correo', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(updateUsuario).mockResolvedValue({ ok: false, reason: 'duplicate_correo' } as never)
    const res = await updateUser(undefined, makeFormData(validFields))
    expect(res?.errors?.correo?.[0]).toMatch(/correo/i)
  })

  it('not_found → error general', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(updateUsuario).mockResolvedValue({ ok: false, reason: 'not_found' } as never)
    const res = await updateUser(undefined, makeFormData(validFields))
    expect(res?.errors?.general?.[0]).toMatch(/no encontrado/i)
  })
})
