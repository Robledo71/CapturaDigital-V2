// tests/unit/services/cargaDeTrabajoService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getCargaDeTrabajoData,
  getOrderWorkloadById,
  getAvailableTablets,
} from '@/back/services/cargaDeTrabajoService'

const ACCESS_TOKEN = 'test-token'

// ─── Factories ────────────────────────────────────────────────────────────────

function makeRawItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    partNumber: 'PN-001',
    partName: 'Pieza A',
    inventory: 100,
    inventoryDone: 20,
    sessionId: null,
    sessionStatus: null,
    assignedAt: null,
    assignedTablet: null,
    hasSubmittedReport: false,
    quotationConsecutive: null,
    ...overrides,
  }
}

function makeRawOrder(overrides: Record<string, unknown> = {}, itemOverrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    consecutiveNumber: 'ORD-001',
    state: 'open',
    serviceTypeName: 'Selección',
    serviceTypeDetail: null,
    piecesPerHour: '120',
    authorizedHours: '8',
    pricePerHour: '150',
    language: 'es',
    userName: 'Luis Garcia',
    clientContactName: 'Contact',
    clientContactEmail: 'contact@client.com',
    hoe: null,
    arranqueSeguro: null,
    clientName: 'Toyota',
    plantId: 3,
    plantName: 'Planta Sur',
    regionName: 'Bajio',
    quotations: [],
    items: [makeRawItem(itemOverrides)],
    ...overrides,
  }
}

function makeWorkloadResponse(orders: unknown[]) {
  return new Response(
    JSON.stringify({ success: true, data: orders }),
    { status: 200 },
  )
}

function makeTabletResponse(tablets: unknown[]) {
  return new Response(
    JSON.stringify({ data: tablets }),
    { status: 200 },
  )
}

function makeSessionsResponse(sessions: unknown[]) {
  return new Response(
    JSON.stringify({ data: sessions }),
    { status: 200 },
  )
}

function makeRawTablet(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    alias: 'Tablet-01',
    codigoTablet: 'TAB-01',
    serialNumber: 'SN-001',
    status: 'activa',
    plantId: 3,
    plantName: 'Planta Sur',
    ...overrides,
  }
}

// ─── getCargaDeTrabajoData ────────────────────────────────────────────────────

describe('getCargaDeTrabajoData', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'app-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetch exitoso → mapea la respuesta a OrderWorkload[]', async () => {
    vi.mocked(fetch).mockResolvedValue(makeWorkloadResponse([makeRawOrder()]))

    const result = await getCargaDeTrabajoData(ACCESS_TOKEN)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 10,
      consecutiveNumber: 'ORD-001',
      clientName: 'Toyota',
      plantName: 'Planta Sur',
      plantId: 3,
    })
  })

  it('sessionStatus "in_progress" → item status: "in_progress"', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeWorkloadResponse([makeRawOrder({}, { sessionStatus: 'in_progress' })]),
    )

    const result = await getCargaDeTrabajoData(ACCESS_TOKEN)

    expect(result[0].items[0].status).toBe('in_progress')
  })

  it('sessionStatus "finished" → item status: "completed"', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeWorkloadResponse([makeRawOrder({}, { sessionStatus: 'finished' })]),
    )

    const result = await getCargaDeTrabajoData(ACCESS_TOKEN)

    expect(result[0].items[0].status).toBe('completed')
  })

  it('item sin sessionStatus → item status: "pending"', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeWorkloadResponse([makeRawOrder({}, { sessionStatus: null })]),
    )

    const result = await getCargaDeTrabajoData(ACCESS_TOKEN)

    expect(result[0].items[0].status).toBe('pending')
  })

  it('fetch falla → lanza error', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('Error', { status: 500 }),
    )

    await expect(getCargaDeTrabajoData(ACCESS_TOKEN)).rejects.toThrow('getCargaDeTrabajoData failed: 500')
  })
})

// ─── getOrderWorkloadById ─────────────────────────────────────────────────────

describe('getOrderWorkloadById', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'app-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('encuentra el order correcto por id', async () => {
    const orders = [
      makeRawOrder({ id: 10, consecutiveNumber: 'ORD-010' }),
      makeRawOrder({ id: 20, consecutiveNumber: 'ORD-020' }),
    ]
    vi.mocked(fetch).mockResolvedValue(makeWorkloadResponse(orders))

    const result = await getOrderWorkloadById(20, ACCESS_TOKEN)

    expect(result).not.toBeNull()
    expect(result!.id).toBe(20)
    expect(result!.consecutiveNumber).toBe('ORD-020')
  })
})

// ─── getAvailableTablets ──────────────────────────────────────────────────────

describe('getAvailableTablets', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'app-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('solo devuelve tablets con status === "activa"', async () => {
    const tablets = [
      makeRawTablet({ id: 1, codigoTablet: 'TAB-01', status: 'activa' }),
      makeRawTablet({ id: 2, codigoTablet: 'TAB-02', status: 'inactiva' }),
      makeRawTablet({ id: 3, codigoTablet: 'TAB-03', status: 'en_mantenimiento' }),
    ]
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeTabletResponse(tablets))
      .mockResolvedValueOnce(makeSessionsResponse([]))

    const result = await getAvailableTablets(ACCESS_TOKEN)

    expect(result).toHaveLength(1)
    expect(result[0].codigoTablet).toBe('TAB-01')
  })

  it('filtra tablets ocupadas (busy) según sesiones activas', async () => {
    const tablets = [
      makeRawTablet({ id: 1, codigoTablet: 'TAB-01', status: 'activa' }),
      makeRawTablet({ id: 2, codigoTablet: 'TAB-02', status: 'activa' }),
    ]
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeTabletResponse(tablets))
      .mockResolvedValueOnce(makeSessionsResponse([{ tabletId: 'TAB-01' }]))

    const result = await getAvailableTablets(ACCESS_TOKEN)

    expect(result).toHaveLength(1)
    expect(result[0].codigoTablet).toBe('TAB-02')
  })

  it('con plantaId = 5 → solo devuelve tablets con plantId === 5', async () => {
    const tablets = [
      makeRawTablet({ id: 1, codigoTablet: 'TAB-01', status: 'activa', plantId: 5 }),
      makeRawTablet({ id: 2, codigoTablet: 'TAB-02', status: 'activa', plantId: 3 }),
    ]
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeTabletResponse(tablets))
      .mockResolvedValueOnce(makeSessionsResponse([]))

    const result = await getAvailableTablets(ACCESS_TOKEN, 5)

    expect(result).toHaveLength(1)
    expect(result[0].codigoTablet).toBe('TAB-01')
  })

  it('con plantaId = null → devuelve todas las tablets activas sin filtrar por planta', async () => {
    const tablets = [
      makeRawTablet({ id: 1, codigoTablet: 'TAB-01', status: 'activa', plantId: 5 }),
      makeRawTablet({ id: 2, codigoTablet: 'TAB-02', status: 'activa', plantId: 3 }),
    ]
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeTabletResponse(tablets))
      .mockResolvedValueOnce(makeSessionsResponse([]))

    const result = await getAvailableTablets(ACCESS_TOKEN, null)

    expect(result).toHaveLength(2)
  })
})
