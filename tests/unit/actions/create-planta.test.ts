import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/back/services/session', () => ({ getSession: vi.fn() }))
vi.mock('@/back/services/plantService', () => ({ createPlanta: vi.fn() }))

import { getSession } from '@/back/services/session'
import { createPlanta as serviceCreatePlanta } from '@/back/services/plantService'
import { createPlanta } from '@/app/actions/create-planta'

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

const mockPlanta = { id: 1, nombre: 'Honda Celaya', direccion: 'Av. Industria 1' } as never

describe('createPlanta', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('sin sesión → no autorizado', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await createPlanta(undefined, makeFormData({ nombre: 'Honda' }))
    expect(res?.errors?.general?.[0]).toBe('No autorizado')
  })

  it('rol supervisor → no autorizado', async () => {
    vi.mocked(getSession).mockResolvedValue({ ...makeSession(), rol: 'supervisor' } as never)
    const res = await createPlanta(undefined, makeFormData({ nombre: 'Honda' }))
    expect(res?.errors?.general?.[0]).toBe('No autorizado')
  })

  it('nombre vacío → error Zod', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const res = await createPlanta(undefined, makeFormData({ nombre: '' }))
    expect(res?.errors?.nombre).toBeDefined()
  })

  it('creación exitosa sin dirección → { success: true, planta }', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(serviceCreatePlanta).mockResolvedValue({ ok: true, planta: mockPlanta } as never)
    const res = await createPlanta(undefined, makeFormData({ nombre: 'Honda Celaya' }))
    expect(res?.success).toBe(true)
    expect(res?.planta).toBeDefined()
  })

  it('creación exitosa con dirección → planta tiene dirección', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(serviceCreatePlanta).mockResolvedValue({ ok: true, planta: mockPlanta } as never)
    await createPlanta(undefined, makeFormData({ nombre: 'Honda', direccion: 'Av. Industria 1' }))
    expect(serviceCreatePlanta).toHaveBeenCalledWith(
      expect.objectContaining({ direccion: 'Av. Industria 1' }),
      'tok',
    )
  })

  it('error inesperado → error general', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(serviceCreatePlanta).mockRejectedValue(new Error('DB error'))
    const res = await createPlanta(undefined, makeFormData({ nombre: 'Honda' }))
    expect(res?.errors?.general).toBeDefined()
  })
})
