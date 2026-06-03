import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/back/services/session', () => ({ getSession: vi.fn() }))
vi.mock('@/back/services/plantService', () => ({ updatePlanta: vi.fn() }))

import { getSession } from '@/back/services/session'
import { updatePlanta as serviceUpdatePlanta } from '@/back/services/plantService'
import { updatePlanta } from '@/app/actions/update-planta'

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

const validFields = { id: '2', nombre: 'Honda Celaya' }
const mockPlanta = { id: 2, nombre: 'Honda Celaya' } as never

describe('updatePlanta', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('sin sesión → no autorizado', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await updatePlanta(undefined, makeFormData(validFields))
    expect(res?.errors?.general?.[0]).toBe('No autorizado')
  })

  it('rol capturacion → no autorizado', async () => {
    vi.mocked(getSession).mockResolvedValue({ ...makeSession(), rol: 'capturacion' } as never)
    const res = await updatePlanta(undefined, makeFormData(validFields))
    expect(res?.errors?.general?.[0]).toBe('No autorizado')
  })

  it('id inválido → error general', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const res = await updatePlanta(undefined, makeFormData({ ...validFields, id: 'abc' }))
    expect(res?.errors?.general?.[0]).toMatch(/ID de planta inválido/i)
  })

  it('nombre vacío → error Zod', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const res = await updatePlanta(undefined, makeFormData({ ...validFields, nombre: '' }))
    expect(res?.errors?.nombre).toBeDefined()
  })

  it('actualización exitosa → { success: true, planta }', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(serviceUpdatePlanta).mockResolvedValue({ ok: true, planta: mockPlanta } as never)
    const res = await updatePlanta(undefined, makeFormData(validFields))
    expect(res?.success).toBe(true)
    expect(res?.planta).toBeDefined()
  })

  it('not_found → error general "Planta no encontrada"', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(serviceUpdatePlanta).mockResolvedValue({ ok: false, reason: 'not_found' } as never)
    const res = await updatePlanta(undefined, makeFormData(validFields))
    expect(res?.errors?.general?.[0]).toMatch(/no encontrada/i)
  })

  it('dirección vacía se envía como null al servicio', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(serviceUpdatePlanta).mockResolvedValue({ ok: true, planta: mockPlanta } as never)
    await updatePlanta(undefined, makeFormData({ ...validFields, direccion: '' }))
    expect(serviceUpdatePlanta).toHaveBeenCalledWith(
      expect.objectContaining({ direccion: null }),
      'tok',
    )
  })
})
