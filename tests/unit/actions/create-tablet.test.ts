import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/back/services/session', () => ({ getSession: vi.fn() }))
vi.mock('@/back/services/tabletService', () => ({ createTablet: vi.fn() }))

import { getSession } from '@/back/services/session'
import { createTablet as serviceCreateTablet } from '@/back/services/tabletService'
import { createTablet } from '@/app/actions/create-tablet'

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

const validFields = { modelo: 'Samsung Galaxy Tab A8', serie: 'SN-ABC-123' }
const mockTablet = { id: 1, modelo: 'Samsung Galaxy Tab A8', serie: 'SN-ABC-123' } as never

describe('createTablet', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('sin sesión → no autorizado', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await createTablet(undefined, makeFormData(validFields))
    expect(res?.errors?.general?.[0]).toBe('No autorizado')
  })

  it('rol supervisor → no autorizado', async () => {
    vi.mocked(getSession).mockResolvedValue({ ...makeSession(), rol: 'supervisor' } as never)
    const res = await createTablet(undefined, makeFormData(validFields))
    expect(res?.errors?.general?.[0]).toBe('No autorizado')
  })

  it('modelo vacío → error Zod', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const res = await createTablet(undefined, makeFormData({ ...validFields, modelo: '' }))
    expect(res?.errors?.modelo).toBeDefined()
  })

  it('serie vacía → error Zod', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const res = await createTablet(undefined, makeFormData({ ...validFields, serie: '' }))
    expect(res?.errors?.serie).toBeDefined()
  })

  it('plantaId no numérico → error de plantaId', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const res = await createTablet(undefined, makeFormData({ ...validFields, plantaId: 'abc' }))
    expect(res?.errors?.plantaId).toBeDefined()
  })

  it('creación exitosa → { success: true, tablet }', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(serviceCreateTablet).mockResolvedValue({ ok: true, tablet: mockTablet } as never)
    const res = await createTablet(undefined, makeFormData(validFields))
    expect(res?.success).toBe(true)
    expect(res?.tablet).toBeDefined()
  })

  it('código duplicado → error en codigotablet', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(serviceCreateTablet).mockResolvedValue({ ok: false, reason: 'duplicate_codigo' } as never)
    const res = await createTablet(undefined, makeFormData(validFields))
    expect(res?.errors?.codigotablet).toBeDefined()
  })

  it('serie duplicada → error en serie', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(serviceCreateTablet).mockResolvedValue({ ok: false, reason: 'duplicate_serie' } as never)
    const res = await createTablet(undefined, makeFormData(validFields))
    expect(res?.errors?.serie).toBeDefined()
  })
})
