import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/back/services/session', () => ({ getSession: vi.fn() }))
vi.mock('@/back/services/tabletService', () => ({ updateTablet: vi.fn() }))

import { getSession } from '@/back/services/session'
import { updateTablet as serviceUpdateTablet } from '@/back/services/tabletService'
import { updateTablet } from '@/app/actions/update-tablet'

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

const validFields = { id: '3', modelo: 'Samsung Tab A8', serie: 'SN-001', estado: 'activa' }
const mockTablet = { id: 3, modelo: 'Samsung Tab A8', serie: 'SN-001' } as never

describe('updateTablet', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('sin sesión → no autorizado', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await updateTablet(undefined, makeFormData(validFields))
    expect(res?.errors?.general?.[0]).toBe('No autorizado')
  })

  it('rol supervisor → no autorizado', async () => {
    vi.mocked(getSession).mockResolvedValue({ ...makeSession(), rol: 'supervisor' } as never)
    const res = await updateTablet(undefined, makeFormData(validFields))
    expect(res?.errors?.general?.[0]).toBe('No autorizado')
  })

  it('id inválido → error de ID', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const res = await updateTablet(undefined, makeFormData({ ...validFields, id: 'abc' }))
    expect(res?.errors?.general?.[0]).toMatch(/ID de tablet inválido/i)
  })

  it('modelo vacío → error Zod', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const res = await updateTablet(undefined, makeFormData({ ...validFields, modelo: '' }))
    expect(res?.errors?.modelo).toBeDefined()
  })

  it('estado inválido → error Zod', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const res = await updateTablet(undefined, makeFormData({ ...validFields, estado: 'bloqueada' }))
    expect(res?.errors?.estado).toBeDefined()
  })

  it('actualización exitosa → { success: true, tablet }', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(serviceUpdateTablet).mockResolvedValue({ ok: true, tablet: mockTablet } as never)
    const res = await updateTablet(undefined, makeFormData(validFields))
    expect(res?.success).toBe(true)
  })

  it('serie duplicada → error en serie', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(serviceUpdateTablet).mockResolvedValue({ ok: false, reason: 'duplicate_serie' } as never)
    const res = await updateTablet(undefined, makeFormData(validFields))
    expect(res?.errors?.serie).toBeDefined()
  })

  it('código duplicado → error en codigotablet', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(serviceUpdateTablet).mockResolvedValue({ ok: false, reason: 'duplicate_codigo' } as never)
    const res = await updateTablet(undefined, makeFormData(validFields))
    expect(res?.errors?.codigotablet).toBeDefined()
  })

  it('not_found → error general', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(serviceUpdateTablet).mockResolvedValue({ ok: false, reason: 'not_found' } as never)
    const res = await updateTablet(undefined, makeFormData(validFields))
    expect(res?.errors?.general?.[0]).toMatch(/no encontrada/i)
  })
})
