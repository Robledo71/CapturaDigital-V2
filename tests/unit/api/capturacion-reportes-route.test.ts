// tests/unit/api/capturacion-reportes-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/back/services/publishedReportesService', () => ({
  getPublishedReportes: vi.fn(),
}))

import { getSession } from '@/back/services/session'
import { getPublishedReportes } from '@/back/services/publishedReportesService'
import { GET } from '@/app/api/capturacion/reportes/route'

function makeSession(rol = 'capturacion') {
  return {
    userId: 1,
    rol,
    codigoEmpleado: 'CAP001',
    nombreCompleto: 'Capturista Test',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    plantaId: null,
    plantaNombre: null,
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  }
}

const mockReportesResult = {
  ok: true,
  stats: { total: 5, descargados: 2 },
  rows: [
    {
      id: '1',
      consecutiveNumber: 'OV-001',
      cliente: 'Bimbo S.A.',
      planta: 'Honda Celaya',
      cotizacion: 'OV-001-CO-100',
      parte: 'PN-001',
      piezas: '500',
      pctNG: '2.0%',
      publicadoAt: '2026-01-15T10:00:00Z',
      supervisor: 'Juan López',
    },
  ],
}

describe('GET /api/capturacion/reportes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin sesión → 401 UNAUTHORIZED', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('UNAUTHORIZED')
  })

  it('rol supervisor (no permitido) → 401 UNAUTHORIZED', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('supervisor') as never)

    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('rol capturacion → 200 con datos de reportes', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('capturacion') as never)
    vi.mocked(getPublishedReportes).mockResolvedValue(mockReportesResult as never)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.rows).toHaveLength(1)
    expect(body.rows[0].id).toBe('1')
  })

  it('rol admin → 200 con datos', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('admin') as never)
    vi.mocked(getPublishedReportes).mockResolvedValue(mockReportesResult as never)

    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('rol lider → 200 con datos', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('lider') as never)
    vi.mocked(getPublishedReportes).mockResolvedValue(mockReportesResult as never)

    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('pasa el accessToken de la sesión a getPublishedReportes', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('capturacion') as never)
    vi.mocked(getPublishedReportes).mockResolvedValue(mockReportesResult as never)

    await GET()

    expect(getPublishedReportes).toHaveBeenCalledWith('access-token')
  })

  it('retorna el resultado completo de getPublishedReportes', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('capturacion') as never)
    vi.mocked(getPublishedReportes).mockResolvedValue(mockReportesResult as never)

    const res = await GET()
    const body = await res.json()

    expect(body.stats.total).toBe(5)
    expect(body.stats.descargados).toBe(2)
  })
})
