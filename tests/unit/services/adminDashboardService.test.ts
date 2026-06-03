// tests/unit/services/adminDashboardService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { getAdminDashboardData } from '@/back/services/adminDashboardService'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRawDashboard(overrides: Partial<{
  usuariosActivos: number
  porRol: Record<string, number>
  totalPlantas: number
  totalTablets: number
  usuariosRecientes: object[]
}> = {}) {
  return {
    usuariosActivos: 10,
    porRol: { admin: 1, supervisor: 3, capturacion: 5, lider: 1 },
    totalPlantas: 4,
    totalTablets: 8,
    usuariosRecientes: [
      {
        id: 1,
        nombre_completo: 'Carlos Mendez',
        codigo_empleado: 'EMP010',
        correo: 'carlos@example.com',
        rol: 'supervisor',
        puesto: 'Supervisor General',
        is_active: true,
        created_at: '2024-01-15T10:00:00.000Z',
      },
    ],
    ...overrides,
  }
}

function makeOkResponse(data: object) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue({ success: true, data }),
  } as unknown as Response
}

function makeErrorResponse(status: number) {
  return {
    ok: false,
    status,
    json: vi.fn().mockResolvedValue({}),
  } as unknown as Response
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('getAdminDashboardData', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'test-app-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetch exitoso → mapea usuariosActivos, porRol, totalPlantas, totalTablets', async () => {
    vi.mocked(fetch).mockResolvedValue(makeOkResponse(makeRawDashboard()))

    const result = await getAdminDashboardData('my-access-token')

    expect(result.stats.usuariosActivos).toBe(10)
    expect(result.stats.plantasActivas).toBe(4)
    expect(result.stats.tabletsRegistradas).toBe(8)
  })

  it('fetch exitoso → mapea desglosePorRol correctamente', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkResponse(
        makeRawDashboard({ porRol: { admin: 2, supervisor: 4, capturacion: 6, lider: 2 } }),
      ),
    )

    const result = await getAdminDashboardData('my-access-token')

    expect(result.stats.desglosePorRol).toEqual({
      admin: 2,
      supervisor: 4,
      capturacion: 6,
      lider: 2,
    })
  })

  it('usuariosRecientes tiene los campos correctos mapeados desde snake_case', async () => {
    vi.mocked(fetch).mockResolvedValue(makeOkResponse(makeRawDashboard()))

    const result = await getAdminDashboardData('my-access-token')

    expect(result.recentUsuarios).toHaveLength(1)
    const u = result.recentUsuarios[0]
    expect(u.id).toBe(1)
    expect(u.nombreCompleto).toBe('Carlos Mendez')
    expect(u.codigoEmpleado).toBe('EMP010')
    expect(u.rol).toBe('supervisor')
    expect(u.isActive).toBe(true)
  })

  it('porRol con roles ausentes → 0 por defecto', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkResponse(makeRawDashboard({ porRol: { supervisor: 2 } })),
    )

    const result = await getAdminDashboardData('my-access-token')

    expect(result.stats.desglosePorRol.admin).toBe(0)
    expect(result.stats.desglosePorRol.capturacion).toBe(0)
    expect(result.stats.desglosePorRol.lider).toBe(0)
    expect(result.stats.desglosePorRol.supervisor).toBe(2)
  })

  it('fetch falla (res.ok = false) → lanza un error', async () => {
    vi.mocked(fetch).mockResolvedValue(makeErrorResponse(500))

    await expect(getAdminDashboardData('my-access-token')).rejects.toThrow(
      'getAdminDashboardData failed: 500',
    )
  })

  it('error de red (fetch lanza) → propaga el error', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network failure'))

    await expect(getAdminDashboardData('my-access-token')).rejects.toThrow('Network failure')
  })

  it('llama a la URL correcta: /qb_sync/users/admin-dashboard', async () => {
    vi.mocked(fetch).mockResolvedValue(makeOkResponse(makeRawDashboard()))

    await getAdminDashboardData('my-access-token')

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/qb_sync/users/admin-dashboard',
      expect.objectContaining({ headers: expect.any(Object) }),
    )
  })

  it('cabeceras incluyen X-App-Token y Authorization con Bearer', async () => {
    vi.mocked(fetch).mockResolvedValue(makeOkResponse(makeRawDashboard()))

    await getAdminDashboardData('token-abc123')

    const [, options] = vi.mocked(fetch).mock.calls[0]
    const headers = (options as RequestInit).headers as Record<string, string>
    expect(headers['X-App-Token']).toBe('test-app-token')
    expect(headers['Authorization']).toBe('Bearer token-abc123')
  })
})
