// tests/unit/actions/import-cotizacion.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/back/services/qb-api', () => ({
  searchOrder: vi.fn(),
  searchCotizaciones: vi.fn(),
}))

vi.mock('@/back/services/qb_sync-api', () => ({
  orderExists: vi.fn(),
}))

vi.mock('@/back/services/cargaDeTrabajoService', () => ({
  getOrderWorkloadById: vi.fn(),
}))

import { getSession } from '@/back/services/session'
import { searchOrder, searchCotizaciones } from '@/back/services/qb-api'
import { orderExists } from '@/back/services/qb_sync-api'
import { getOrderWorkloadById } from '@/back/services/cargaDeTrabajoService'
import { importCotizacionAction } from '@/app/actions/import-cotizacion'
import type { OrderWorkload, OrderItemWorkload } from '@/back/services/cargaDeTrabajoService'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<{
  userId: number
  rol: 'admin' | 'supervisor' | 'capturacion' | 'lider' | 'cliente'
  plantaNombre: string | null
  plantaId: number | null
}> = {}) {
  return {
    userId: 1,
    rol: 'supervisor' as const,
    codigoEmpleado: 'EMP001',
    nombreCompleto: 'Ana Torres',
    plantaId: 5,
    plantaNombre: 'Honda Celaya',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  }
}

function makeQBOrder(overrides: Partial<{
  id: number
  plant_name: string | null
  consecutive_number: string
  client_name: string | null
}> = {}) {
  return {
    id: 1001,
    state: 'open',
    consecutive_number: 'ORD-001',
    service_type_detail: 'Inspección',
    pieces_per_hour: '100',
    authorized_hours: '8',
    price_per_hour: '250',
    language: 'es',
    user_name: 'Vendedor X',
    region_name: 'Centro',
    client_name: 'Honda México',
    client_contact_name: null,
    client_contact_email: null,
    service_type_name: 'Inspección 100%',
    plant_name: 'Honda Celaya',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeQBCotizacion() {
  return {
    id: 500,
    consecutive_number: 'COT-001',
    client_name: 'Honda México',
    client_email: 'cliente@honda.com',
    status: 'aprobada',
    purchase_order_number: 'PO-999',
    contact_emails: null,
    order_user_name: 'Vendedor X',
    order_consecutive_number: 'ORD-001',
    region_name: 'Centro',
    plant_name: 'Honda Celaya',
    order_id: 1001,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    order_items: [
      {
        inventory: '50',
        inventory_done: '0',
        part_number: 'HN-5540',
        part_name: 'Panel Lateral',
        incidents: null,
        plant_name: 'Honda Celaya',
      },
    ],
  }
}

function makeFormData(orden: string): FormData {
  const fd = new FormData()
  fd.append('orden', orden)
  return fd
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('importCotizacionAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. Sin sesión
  it('sin sesión → { ok: false, error: "No autorizado." }, fetch no llamado', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const result = await importCotizacionAction(undefined, makeFormData('ORD-001'))

    expect(result).toEqual({ ok: false, error: 'No autorizado.' })
    expect(searchOrder).not.toHaveBeenCalled()
  })

  // 2. Rol capturacion → no autorizado
  it('rol "capturacion" → { ok: false, error: "No autorizado." }', async () => {
    vi.mocked(getSession).mockResolvedValue(
      makeSession({ rol: 'capturacion' }) as never,
    )

    const result = await importCotizacionAction(undefined, makeFormData('ORD-001'))

    expect(result).toEqual({ ok: false, error: 'No autorizado.' })
    expect(searchOrder).not.toHaveBeenCalled()
  })

  // 3. Número de orden vacío → error Zod
  it('número de orden vacío → error de validación', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)

    const result = await importCotizacionAction(undefined, makeFormData(''))

    expect(result).toMatchObject({ ok: false })
    expect((result as { ok: false; error: string }).error).toBeTruthy()
    expect(searchOrder).not.toHaveBeenCalled()
  })

  // 4. QB API devuelve found: false → error not_found
  it('QB API devuelve found: false → { ok: false, error: "Orden no encontrada en QB." }', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(searchOrder).mockResolvedValue({ ok: true, found: false })

    const result = await importCotizacionAction(undefined, makeFormData('ORD-001'))

    expect(result).toEqual({ ok: false, error: 'Orden no encontrada en QB.' })
  })

  // 4b. Orden cerrada → bloqueada (no admite nuevas asignaciones)
  it('orden cerrada en QB → { ok:false } y no consulta cotizaciones', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(searchOrder).mockResolvedValue({
      ok: true,
      found: true,
      data: { ...makeQBOrder(), state: 'closed' },
    } as never)

    const result = await importCotizacionAction(undefined, makeFormData('ORD-001'))

    expect(result).toEqual({
      ok: false,
      error: 'Esta orden está cerrada y no admite nuevas asignaciones.',
    })
    expect(searchCotizaciones).not.toHaveBeenCalled()
    expect(orderExists).not.toHaveBeenCalled()
  })

  // 5. Orden ya existe en DB — merge: items persistidos se fusionan con los de QB
  it('orden ya existe en DB → merge items persistidos + QB, retorna ok:true', async () => {
    const persistedItem: OrderItemWorkload = {
      id: 42,
      partNumber: 'HN-5540',
      partName: 'Panel Lateral',
      status: 'in_progress',
      inventario: 50,
      inventarioTerminado: 0,
      assignedAt: null,
      assignedTablet: { id: 7, alias: 'T-07', serialNumber: null },
      quotationConsecutive: 'COT-001',
      hasSubmittedReport: false,
      hoe: null,
      arranqueSeguro: null,
    }
    const persistedOrder: OrderWorkload = {
      id: 999,
      consecutiveNumber: 'ORD-001',
      clientName: 'Honda México',
      plantName: 'Honda Celaya',
      plantId: 5,
      partNumber: 'HN-5540',
      partName: 'Panel Lateral',
      serviceType: 'Inspección',
      orderStatus: 'open',
      regionName: null,
      serviceTypeDetail: null,
      piecesPerHour: null,
      authorizedHours: null,
      pricePerHour: null,
      language: null,
      userName: null,
      clientContactName: null,
      clientContactEmail: null,
      quotations: [],
      items: [persistedItem],
      hoe: null,
      arranqueSeguro: null,
    }

    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(searchOrder).mockResolvedValue({
      ok: true,
      found: true,
      data: makeQBOrder(),
    })
    vi.mocked(orderExists).mockResolvedValue(true)
    vi.mocked(searchCotizaciones).mockResolvedValue({
      ok: true,
      data: [makeQBCotizacion()],
    })
    vi.mocked(getOrderWorkloadById).mockResolvedValue(persistedOrder)

    const result = await importCotizacionAction(undefined, makeFormData('ORD-001'))

    expect(result).toMatchObject({ ok: true })
    const { order } = result as { ok: true; order: OrderWorkload }
    // The persisted DB id must be used (not the QB id)
    expect(order.id).toBe(999)
    // The item that existed in DB must carry its persisted state (id=42, tablet assigned)
    expect(order.items).toHaveLength(1)
    expect(order.items[0].id).toBe(42)
    expect(order.items[0].status).toBe('in_progress')
    expect(order.items[0].assignedTablet).not.toBeNull()
  })

  // 5b. Merge: QB tiene un item nuevo (no persistido) → aparece como id=0 pending
  it('merge — QB trae un item nuevo no persistido → aparece con id=0 y status pending', async () => {
    const persistedItem: OrderItemWorkload = {
      id: 42,
      partNumber: 'HN-5540',
      partName: 'Panel Lateral',
      status: 'in_progress',
      inventario: 50,
      inventarioTerminado: 0,
      assignedAt: null,
      assignedTablet: { id: 7, alias: 'T-07', serialNumber: null },
      quotationConsecutive: 'COT-001',
      hasSubmittedReport: false,
      hoe: null,
      arranqueSeguro: null,
    }
    const persistedOrder: OrderWorkload = {
      id: 999,
      consecutiveNumber: 'ORD-001',
      clientName: 'Honda México',
      plantName: 'Honda Celaya',
      plantId: 5,
      partNumber: 'HN-5540',
      partName: 'Panel Lateral',
      serviceType: 'Inspección',
      orderStatus: 'open',
      regionName: null,
      serviceTypeDetail: null,
      piecesPerHour: null,
      authorizedHours: null,
      pricePerHour: null,
      language: null,
      userName: null,
      clientContactName: null,
      clientContactEmail: null,
      quotations: [],
      items: [persistedItem],
      hoe: null,
      arranqueSeguro: null,
    }

    // QB cotizacion has two items: the already-persisted one AND a new one
    const qbCotizacionWithTwoItems = {
      ...makeQBCotizacion(),
      order_items: [
        {
          inventory: '50',
          inventory_done: '0',
          part_number: 'HN-5540',
          part_name: 'Panel Lateral',
          incidents: null,
          plant_name: 'Honda Celaya',
        },
        {
          inventory: '30',
          inventory_done: '0',
          part_number: 'HN-9900',
          part_name: 'Tapa Motor',
          incidents: null,
          plant_name: 'Honda Celaya',
        },
      ],
    }

    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(searchOrder).mockResolvedValue({
      ok: true,
      found: true,
      data: makeQBOrder(),
    })
    vi.mocked(orderExists).mockResolvedValue(true)
    vi.mocked(searchCotizaciones).mockResolvedValue({
      ok: true,
      data: [qbCotizacionWithTwoItems],
    })
    vi.mocked(getOrderWorkloadById).mockResolvedValue(persistedOrder)

    const result = await importCotizacionAction(undefined, makeFormData('ORD-001'))

    expect(result).toMatchObject({ ok: true })
    const { order } = result as { ok: true; order: OrderWorkload }
    expect(order.items).toHaveLength(2)

    const alreadyAssigned = order.items.find((i) => i.partNumber === 'HN-5540')
    expect(alreadyAssigned?.id).toBe(42)
    expect(alreadyAssigned?.status).toBe('in_progress')

    const newItem = order.items.find((i) => i.partNumber === 'HN-9900')
    expect(newItem?.id).toBe(0)
    expect(newItem?.status).toBe('pending')
    expect(newItem?.assignedTablet).toBeNull()
  })

  // 5c. Merge: persisted tiene item que QB ya no lista → se conserva en el resultado
  it('merge — item persistido ausente en QB se conserva para no perder items asignados', async () => {
    const persistedItem: OrderItemWorkload = {
      id: 42,
      partNumber: 'HN-5540',
      partName: 'Panel Lateral',
      status: 'completed',
      inventario: 50,
      inventarioTerminado: 50,
      assignedAt: null,
      assignedTablet: null,
      quotationConsecutive: 'COT-001',
      hasSubmittedReport: true,
      hoe: null,
      arranqueSeguro: null,
    }
    const persistedOrder: OrderWorkload = {
      id: 999,
      consecutiveNumber: 'ORD-001',
      clientName: 'Honda México',
      plantName: 'Honda Celaya',
      plantId: 5,
      partNumber: 'HN-5540',
      partName: 'Panel Lateral',
      serviceType: 'Inspección',
      orderStatus: 'open',
      regionName: null,
      serviceTypeDetail: null,
      piecesPerHour: null,
      authorizedHours: null,
      pricePerHour: null,
      language: null,
      userName: null,
      clientContactName: null,
      clientContactEmail: null,
      quotations: [],
      items: [persistedItem],
      hoe: null,
      arranqueSeguro: null,
    }

    // QB cotizacion has a DIFFERENT item (the old one was removed from QB)
    const qbCotizacionDifferentItem = {
      ...makeQBCotizacion(),
      order_items: [
        {
          inventory: '30',
          inventory_done: '0',
          part_number: 'HN-9900',
          part_name: 'Tapa Motor',
          incidents: null,
          plant_name: 'Honda Celaya',
        },
      ],
    }

    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(searchOrder).mockResolvedValue({
      ok: true,
      found: true,
      data: makeQBOrder(),
    })
    vi.mocked(orderExists).mockResolvedValue(true)
    vi.mocked(searchCotizaciones).mockResolvedValue({
      ok: true,
      data: [qbCotizacionDifferentItem],
    })
    vi.mocked(getOrderWorkloadById).mockResolvedValue(persistedOrder)

    const result = await importCotizacionAction(undefined, makeFormData('ORD-001'))

    expect(result).toMatchObject({ ok: true })
    const { order } = result as { ok: true; order: OrderWorkload }
    // Both items must be present: the new QB item AND the old persisted one
    expect(order.items).toHaveLength(2)
    const preserved = order.items.find((i) => i.partNumber === 'HN-5540')
    expect(preserved?.id).toBe(42)
    expect(preserved?.status).toBe('completed')
  })

  // 5d. Merge: getOrderWorkloadById retorna null (inconsistencia) → cae back a datos QB
  it('merge — getOrderWorkloadById retorna null → retorna datos QB (fallback)', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(searchOrder).mockResolvedValue({
      ok: true,
      found: true,
      data: makeQBOrder(),
    })
    vi.mocked(orderExists).mockResolvedValue(true)
    vi.mocked(searchCotizaciones).mockResolvedValue({
      ok: true,
      data: [makeQBCotizacion()],
    })
    vi.mocked(getOrderWorkloadById).mockResolvedValue(null)

    const result = await importCotizacionAction(undefined, makeFormData('ORD-001'))

    expect(result).toMatchObject({ ok: true })
    const { order } = result as { ok: true; order: OrderWorkload }
    // Falls back to QB data: QB order id, item with id=0
    expect(order.id).toBe(1001)
    expect(order.items[0].id).toBe(0)
  })

  // 6. Filtro de planta: supervisor con planta distinta → rechazado
  it('supervisor con planta distinta a la orden → { ok: false, error: "...Solo puedes gestionar..." }', async () => {
    vi.mocked(getSession).mockResolvedValue(
      makeSession({ rol: 'supervisor', plantaNombre: 'Honda Celaya' }) as never,
    )
    vi.mocked(searchOrder).mockResolvedValue({
      ok: true,
      found: true,
      data: makeQBOrder({ plant_name: 'Toyota Aguascalientes' }),
    })
    vi.mocked(orderExists).mockResolvedValue(false)

    const result = await importCotizacionAction(undefined, makeFormData('ORD-001'))

    expect(result).toMatchObject({ ok: false })
    expect((result as { ok: false; error: string }).error).toContain(
      'Solo puedes gestionar órdenes de tu planta asignada',
    )
  })

  // 7. Admin pasa el filtro de planta sin importar la planta de la orden
  it('admin importa orden de cualquier planta → éxito', async () => {
    vi.mocked(getSession).mockResolvedValue(
      makeSession({ rol: 'admin', plantaNombre: null, plantaId: null }) as never,
    )
    vi.mocked(searchOrder).mockResolvedValue({
      ok: true,
      found: true,
      data: makeQBOrder({ plant_name: 'Toyota Aguascalientes' }),
    })
    vi.mocked(orderExists).mockResolvedValue(false)
    vi.mocked(searchCotizaciones).mockResolvedValue({
      ok: true,
      data: [makeQBCotizacion()],
    })

    const result = await importCotizacionAction(undefined, makeFormData('ORD-001'))

    expect(result).toMatchObject({ ok: true })
  })

  // 8. Supervisor con misma planta → éxito
  it('supervisor con misma planta que la orden → { ok: true, order: OrderWorkload }', async () => {
    vi.mocked(getSession).mockResolvedValue(
      makeSession({ rol: 'supervisor', plantaNombre: 'Honda Celaya' }) as never,
    )
    vi.mocked(searchOrder).mockResolvedValue({
      ok: true,
      found: true,
      data: makeQBOrder({ plant_name: 'Honda Celaya' }),
    })
    vi.mocked(orderExists).mockResolvedValue(false)
    vi.mocked(searchCotizaciones).mockResolvedValue({
      ok: true,
      data: [makeQBCotizacion()],
    })

    const result = await importCotizacionAction(undefined, makeFormData('ORD-001'))

    expect(result).toMatchObject({ ok: true })
    const successResult = result as { ok: true; order: { id: number; plantName: string } }
    expect(successResult.order.id).toBe(1001)
    expect(successResult.order.plantName).toBe('Honda Celaya')
  })

  // 8b. Comparación de planta es case-insensitive y sin espacios extra
  it('comparación de planta ignora mayúsculas y espacios extra', async () => {
    vi.mocked(getSession).mockResolvedValue(
      makeSession({ rol: 'supervisor', plantaNombre: '  Honda Celaya  ' }) as never,
    )
    vi.mocked(searchOrder).mockResolvedValue({
      ok: true,
      found: true,
      data: makeQBOrder({ plant_name: 'honda celaya' }),
    })
    vi.mocked(orderExists).mockResolvedValue(false)
    vi.mocked(searchCotizaciones).mockResolvedValue({
      ok: true,
      data: [makeQBCotizacion()],
    })

    const result = await importCotizacionAction(undefined, makeFormData('ORD-001'))

    expect(result).toMatchObject({ ok: true })
  })

  // 9. QB API error de red → error de red
  it('QB API lanza error de red → devuelve mensaje de error', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(searchOrder).mockResolvedValue({
      ok: false,
      error: 'network',
      message: 'Network error',
    })

    const result = await importCotizacionAction(undefined, makeFormData('ORD-001'))

    expect(result).toMatchObject({ ok: false })
    expect((result as { ok: false; error: string }).error).toContain('QB')
  })

  // 10. Orden con items correctamente mapeados a OrderItemWorkload
  it('la orden importada tiene items con status "pending" y sin tablet asignada', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(searchOrder).mockResolvedValue({
      ok: true,
      found: true,
      data: makeQBOrder(),
    })
    vi.mocked(orderExists).mockResolvedValue(false)
    vi.mocked(searchCotizaciones).mockResolvedValue({
      ok: true,
      data: [makeQBCotizacion()],
    })

    const result = await importCotizacionAction(undefined, makeFormData('ORD-001'))

    const successResult = result as { ok: true; order: { items: Array<{ status: string; assignedTablet: null }> } }
    expect(successResult.order.items[0].status).toBe('pending')
    expect(successResult.order.items[0].assignedTablet).toBeNull()
  })
})
