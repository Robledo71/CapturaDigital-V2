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

import { getSession } from '@/back/services/session'
import { searchOrder, searchCotizaciones } from '@/back/services/qb-api'
import { orderExists } from '@/back/services/qb_sync-api'
import { importCotizacionAction } from '@/app/actions/import-cotizacion'

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

  // 5. Orden ya existe en DB → error de duplicado
  it('orden ya existe en DB → { ok: false, error: "Esta orden ya fue importada..." }', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(searchOrder).mockResolvedValue({
      ok: true,
      found: true,
      data: makeQBOrder(),
    })
    vi.mocked(orderExists).mockResolvedValue(true)

    const result = await importCotizacionAction(undefined, makeFormData('ORD-001'))

    expect(result).toMatchObject({ ok: false })
    expect((result as { ok: false; error: string }).error).toContain('ya fue importada')
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
