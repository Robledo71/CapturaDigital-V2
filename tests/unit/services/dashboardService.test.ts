// tests/unit/services/dashboardService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getSupervisorDashboardStats,
  getDashboardBandeja,
  getDashboardProduccion,
} from '@/back/services/dashboardService'

const ACCESS_TOKEN = 'test-token'

// ─── Factories ────────────────────────────────────────────────────────────────

function makeStatsPayload(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      stats: {
        pendientes_en_piso: 3,
        espera_revision: 5,
        publicados_hoy: 2,
        pct_ng_semana: '1.50',
        ...overrides,
      },
      bandeja: [],
    },
  }
}

function makeBandejaRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    created_at: new Date('2026-01-01T10:00:00Z').toISOString(),
    part_number: 'PN-001',
    client_name: 'Honda',
    plant_name: 'Planta Norte',
    operadores: 'Juan Perez',
    ...overrides,
  }
}

function makeProduccionPayload(hasSubmitted: boolean) {
  return {
    data: [
      {
        inspector_name: 'Ana Lopez',
        quotation_consecutive: 'QT-2026-001',
        id_tablet: 'TAB-001',
        has_submitted_report: hasSubmitted,
        inventory_done: 10,
        inventory: 50,
      },
    ],
  }
}

// ─── getSupervisorDashboardStats ──────────────────────────────────────────────

describe('getSupervisorDashboardStats', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'app-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetch exitoso → mapea correctamente los campos del API', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(makeStatsPayload()), { status: 200 }),
    )

    const result = await getSupervisorDashboardStats(ACCESS_TOKEN)

    expect(result).toEqual({
      pendientesEnPiso: 3,
      esperanRevision: 5,
      publicadosHoy: 2,
      pctNGSemana: '1.50%',
    })
  })

  it('res.ok = false → devuelve objeto con todos los valores en 0/default', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('Unauthorized', { status: 401 }),
    )

    const result = await getSupervisorDashboardStats(ACCESS_TOKEN)

    expect(result).toEqual({
      pendientesEnPiso: 0,
      esperanRevision: 0,
      publicadosHoy: 0,
      pctNGSemana: '0.00%',
    })
  })

  it('fetch lanza error de red → devuelve valores default', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network Error'))

    const result = await getSupervisorDashboardStats(ACCESS_TOKEN)

    expect(result).toEqual({
      pendientesEnPiso: 0,
      esperanRevision: 0,
      publicadosHoy: 0,
      pctNGSemana: '0.00%',
    })
  })
})

// ─── getDashboardBandeja ───────────────────────────────────────────────────────

describe('getDashboardBandeja', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'app-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetch exitoso → devuelve array de BandejaReporteRow con campos mapeados', async () => {
    const payload = {
      data: {
        stats: {},
        bandeja: [makeBandejaRow()],
      },
    }
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    )

    const result = await getDashboardBandeja(ACCESS_TOKEN)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: '1',
      part: 'PN-001',
      client: 'Honda',
      plant: 'Planta Norte',
      operadores: 'Juan Perez',
      initials: 'JP',
    })
    expect(result[0].time).toBeDefined()
  })

  it('fetch falla → devuelve []', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('Error', { status: 500 }),
    )

    const result = await getDashboardBandeja(ACCESS_TOKEN)

    expect(result).toEqual([])
  })
})

// ─── getDashboardProduccion ────────────────────────────────────────────────────

describe('getDashboardProduccion', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'app-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetch exitoso → devuelve array de ProduccionItem', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(makeProduccionPayload(false)), { status: 200 }),
    )

    const result = await getDashboardProduccion(ACCESS_TOKEN)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      operadores: 'Ana Lopez',
      initials: 'AL',
      report: 'QT-2026-001',
      tabletCode: 'TAB-001',
      current: 10,
      total: 50,
    })
  })

  it('has_submitted_report: true → status: "Enviado"', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(makeProduccionPayload(true)), { status: 200 }),
    )

    const result = await getDashboardProduccion(ACCESS_TOKEN)

    expect(result[0].status).toBe('Enviado')
  })

  it('has_submitted_report: false → status: "Pendiente"', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(makeProduccionPayload(false)), { status: 200 }),
    )

    const result = await getDashboardProduccion(ACCESS_TOKEN)

    expect(result[0].status).toBe('Pendiente')
  })
})
