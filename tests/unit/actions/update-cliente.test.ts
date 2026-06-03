import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/back/services/session', () => ({ getSession: vi.fn() }))
vi.mock('@/back/services/clientService', () => ({ updateCliente: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { getSession } from '@/back/services/session'
import { updateCliente as serviceUpdateCliente } from '@/back/services/clientService'
import { revalidatePath } from 'next/cache'
import { updateCliente } from '@/app/actions/update-cliente'

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

const validFields = { id: '10', nombre: 'Bimbo S.A.' }
const mockCliente = { id: 10, nombre: 'Bimbo S.A.' } as never

describe('updateCliente', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('sin sesión → no autorizado', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await updateCliente(undefined, makeFormData(validFields))
    expect(res?.errors?.general?.[0]).toBe('No autorizado')
  })

  it('rol lider → no autorizado', async () => {
    vi.mocked(getSession).mockResolvedValue({ ...makeSession(), rol: 'lider' } as never)
    const res = await updateCliente(undefined, makeFormData(validFields))
    expect(res?.errors?.general?.[0]).toBe('No autorizado')
  })

  it('id inválido → error general', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const res = await updateCliente(undefined, makeFormData({ ...validFields, id: 'abc' }))
    expect(res?.errors?.general?.[0]).toMatch(/ID de cliente inválido/i)
  })

  it('nombre vacío → error Zod', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const res = await updateCliente(undefined, makeFormData({ ...validFields, nombre: '' }))
    expect(res?.errors?.nombre).toBeDefined()
  })

  it('actualización exitosa → { success: true, cliente } + revalidatePath', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(serviceUpdateCliente).mockResolvedValue({ ok: true, cliente: mockCliente } as never)
    const res = await updateCliente(undefined, makeFormData(validFields))
    expect(res?.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith('/admin/clientes')
  })

  it('not_found → error general "Cliente no encontrado"', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(serviceUpdateCliente).mockResolvedValue({ ok: false, reason: 'not_found' } as never)
    const res = await updateCliente(undefined, makeFormData(validFields))
    expect(res?.errors?.general?.[0]).toMatch(/no encontrado/i)
  })
})
