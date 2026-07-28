// tests/unit/services/cargaDeTrabajoService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getCargaDeTrabajoData,
  getOrderWorkloadById,
  getAvailableInspectors,
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
    assignedInspectors: [],
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

function makeUsersResponse(users: unknown[]) {
  return new Response(
    JSON.stringify({ data: users }),
    { status: 200 },
  )
}

function makeRawUser(overrides: Record<string, unknown> = {}) {
  return {
    empleado_id: 16,
    id: 5,
    codigo_empleado: 'EMP016',
    nombre_completo: 'Juan Perez',
    planta_id: 3,
    planta_nombre: 'Planta Sur',
    plantas: [{ id: 3, nombre: 'Planta Sur' }],
    rol: 'inspector',
    correo: 'juan.perez@example.com',
    is_active: true,
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

  it('item sin assignedInspectors → mapea a []', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeWorkloadResponse([makeRawOrder({}, { assignedInspectors: null })]),
    )

    const result = await getCargaDeTrabajoData(ACCESS_TOKEN)

    expect(result[0].items[0].assignedInspectors).toEqual([])
  })

  it('item con assignedInspectors → los mapea tal cual (id + name)', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeWorkloadResponse([
        makeRawOrder({}, {
          assignedInspectors: [
            { id: 16, name: 'Juan Perez' },
            { id: 13, name: 'Maria Lopez' },
          ],
        }),
      ]),
    )

    const result = await getCargaDeTrabajoData(ACCESS_TOKEN)

    expect(result[0].items[0].assignedInspectors).toEqual([
      { id: 16, name: 'Juan Perez' },
      { id: 13, name: 'Maria Lopez' },
    ])
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

// ─── getAvailableInspectors ───────────────────────────────────────────────────

describe('getAvailableInspectors', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'app-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('solo devuelve usuarios con rol === "inspector"', async () => {
    const users = [
      makeRawUser({ empleado_id: 16, nombre_completo: 'Juan Perez', rol: 'inspector' }),
      makeRawUser({ empleado_id: 20, nombre_completo: 'Ana Soto', rol: 'supervisor' }),
      makeRawUser({ empleado_id: 21, nombre_completo: 'Luis Ramirez', rol: 'capturacion' }),
    ]
    vi.mocked(fetch).mockResolvedValueOnce(makeUsersResponse(users))

    const result = await getAvailableInspectors(ACCESS_TOKEN)

    expect(result).toHaveLength(1)
    expect(result[0].empleadoId).toBe(16)
    expect(result[0].name).toBe('Juan Perez')
  })

  it('con plantaId = 5 → solo devuelve inspectores cuyas plantas incluyen 5', async () => {
    const users = [
      makeRawUser({ empleado_id: 1, nombre_completo: 'Inspector Uno', plantas: [{ id: 5, nombre: 'Planta 5' }] }),
      makeRawUser({ empleado_id: 2, nombre_completo: 'Inspector Dos', plantas: [{ id: 3, nombre: 'Planta 3' }] }),
    ]
    vi.mocked(fetch).mockResolvedValueOnce(makeUsersResponse(users))

    const result = await getAvailableInspectors(ACCESS_TOKEN, 5)

    expect(result).toHaveLength(1)
    expect(result[0].empleadoId).toBe(1)
  })

  it('con plantaId = 5 → también coincide un inspector con VARIAS plantas que incluyan 5', async () => {
    const users = [
      makeRawUser({
        empleado_id: 1,
        nombre_completo: 'Inspector Multi-planta',
        plantas: [
          { id: 3, nombre: 'Planta 3' },
          { id: 5, nombre: 'Planta 5' },
        ],
      }),
    ]
    vi.mocked(fetch).mockResolvedValueOnce(makeUsersResponse(users))

    const result = await getAvailableInspectors(ACCESS_TOKEN, 5)

    expect(result).toHaveLength(1)
    expect(result[0].plantIds).toEqual([3, 5])
  })

  it('con plantaId = null → devuelve todos los inspectores sin filtrar por planta', async () => {
    const users = [
      makeRawUser({ empleado_id: 1, nombre_completo: 'Inspector Uno', plantas: [{ id: 5, nombre: 'Planta 5' }] }),
      makeRawUser({ empleado_id: 2, nombre_completo: 'Inspector Dos', plantas: [{ id: 3, nombre: 'Planta 3' }] }),
    ]
    vi.mocked(fetch).mockResolvedValueOnce(makeUsersResponse(users))

    const result = await getAvailableInspectors(ACCESS_TOKEN, null)

    expect(result).toHaveLength(2)
  })

  it('mapea empleado_id, name y plantIds (arreglo completo) a InspectorOption', async () => {
    const users = [
      makeRawUser({
        empleado_id: 16,
        nombre_completo: 'Juan Perez',
        plantas: [
          { id: 3, nombre: 'Planta Sur' },
          { id: 7, nombre: 'Planta Norte' },
        ],
      }),
    ]
    vi.mocked(fetch).mockResolvedValueOnce(makeUsersResponse(users))

    const result = await getAvailableInspectors(ACCESS_TOKEN)

    expect(result[0]).toEqual({
      empleadoId: 16,
      name: 'Juan Perez',
      plantIds: [3, 7],
    })
  })

  it('sin campo "plantas" en la respuesta → usa planta_id legacy como único elemento', async () => {
    const users = [
      makeRawUser({
        empleado_id: 16,
        nombre_completo: 'Juan Perez',
        planta_id: 3,
        plantas: undefined,
      }),
    ]
    vi.mocked(fetch).mockResolvedValueOnce(makeUsersResponse(users))

    const result = await getAvailableInspectors(ACCESS_TOKEN)

    expect(result[0].plantIds).toEqual([3])
  })

  it('ordena por nombre', async () => {
    const users = [
      makeRawUser({ empleado_id: 1, nombre_completo: 'Zoe' }),
      makeRawUser({ empleado_id: 2, nombre_completo: 'Ana' }),
    ]
    vi.mocked(fetch).mockResolvedValueOnce(makeUsersResponse(users))

    const result = await getAvailableInspectors(ACCESS_TOKEN)

    expect(result.map((r) => r.name)).toEqual(['Ana', 'Zoe'])
  })

  it('respuesta no ok → devuelve []', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('Error', { status: 500 }))

    const result = await getAvailableInspectors(ACCESS_TOKEN)

    expect(result).toEqual([])
  })

  it('error de red → devuelve []', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const result = await getAvailableInspectors(ACCESS_TOKEN)

    expect(result).toEqual([])
  })
})
