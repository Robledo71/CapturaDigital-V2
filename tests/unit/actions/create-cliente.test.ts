import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/back/services/session', () => ({ getSession: vi.fn() }))
vi.mock('@/back/services/clientService', () => ({ createCliente: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { getSession } from '@/back/services/session'
import { createCliente as serviceCreateCliente } from '@/back/services/clientService'
import { revalidatePath } from 'next/cache'
import { createCliente } from '@/app/actions/create-cliente'

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

const mockCliente = { id: 10, nombre: 'Bimbo S.A.' } as never

describe('createCliente', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('sin sesión → no autorizado', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await createCliente(undefined, makeFormData({ nombre: 'Bimbo' }))
    expect(res?.errors?.general?.[0]).toBe('No autorizado')
  })

  it('rol supervisor → no autorizado', async () => {
    vi.mocked(getSession).mockResolvedValue({ ...makeSession(), rol: 'supervisor' } as never)
    const res = await createCliente(undefined, makeFormData({ nombre: 'Bimbo' }))
    expect(res?.errors?.general?.[0]).toBe('No autorizado')
  })

  it('nombre vacío → error Zod', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const res = await createCliente(undefined, makeFormData({ nombre: '' }))
    expect(res?.errors?.nombre).toBeDefined()
  })

  it('creación exitosa → { success: true, cliente } + revalidatePath', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(serviceCreateCliente).mockResolvedValue({ ok: true, cliente: mockCliente } as never)
    const res = await createCliente(undefined, makeFormData({ nombre: 'Bimbo S.A.' }))
    expect(res?.success).toBe(true)
    expect(res?.cliente).toBeDefined()
    expect(revalidatePath).toHaveBeenCalledWith('/admin/clientes')
  })

  it('nombre duplicado → error en campo nombre', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(serviceCreateCliente).mockResolvedValue({ ok: false, reason: 'duplicate_name' } as never)
    const res = await createCliente(undefined, makeFormData({ nombre: 'Bimbo S.A.' }))
    expect(res?.errors?.nombre?.[0]).toMatch(/ya existe/i)
  })

  it('error genérico del servicio → error general', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(serviceCreateCliente).mockResolvedValue({ ok: false, reason: 'error' } as never)
    const res = await createCliente(undefined, makeFormData({ nombre: 'Bimbo' }))
    expect(res?.errors?.general).toBeDefined()
  })
})
