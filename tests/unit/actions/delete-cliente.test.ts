import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/back/services/session', () => ({ getSession: vi.fn() }))
vi.mock('@/back/services/clientService', () => ({ deleteCliente: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { getSession } from '@/back/services/session'
import { deleteCliente as serviceDeleteCliente } from '@/back/services/clientService'
import { revalidatePath } from 'next/cache'
import { deleteClienteAction } from '@/app/actions/delete-cliente'

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

describe('deleteClienteAction', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('sin sesión → { error: "No autorizado" }', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await deleteClienteAction(undefined, makeFormData({ id: '10' }))
    expect(res?.error).toBe('No autorizado')
  })

  it('rol capturacion → no autorizado', async () => {
    vi.mocked(getSession).mockResolvedValue({ ...makeSession(), rol: 'capturacion' } as never)
    const res = await deleteClienteAction(undefined, makeFormData({ id: '10' }))
    expect(res?.error).toBe('No autorizado')
  })

  it('id inválido (NaN) → error de ID', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const res = await deleteClienteAction(undefined, makeFormData({ id: 'abc' }))
    expect(res?.error).toMatch(/ID de cliente inválido/i)
  })

  it('eliminación exitosa → { ok: true } + revalidatePath', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(serviceDeleteCliente).mockResolvedValue({ ok: true } as never)
    const res = await deleteClienteAction(undefined, makeFormData({ id: '10' }))
    expect(res?.ok).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith('/admin/clientes')
  })

  it('not_found → { error: "Cliente no encontrado" }', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(serviceDeleteCliente).mockResolvedValue({ ok: false, reason: 'not_found' } as never)
    const res = await deleteClienteAction(undefined, makeFormData({ id: '99' }))
    expect(res?.error).toMatch(/no encontrado/i)
  })

  it('error genérico del servicio → error general', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(serviceDeleteCliente).mockResolvedValue({ ok: false, reason: 'error' } as never)
    const res = await deleteClienteAction(undefined, makeFormData({ id: '10' }))
    expect(res?.error).toBeDefined()
  })

  it('llama al servicio con el id correcto y el accessToken', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(serviceDeleteCliente).mockResolvedValue({ ok: true } as never)
    await deleteClienteAction(undefined, makeFormData({ id: '42' }))
    expect(serviceDeleteCliente).toHaveBeenCalledWith(42, 'tok')
  })
})
