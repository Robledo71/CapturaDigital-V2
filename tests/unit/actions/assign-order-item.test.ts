import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

import { getSession } from '@/back/services/session'
import { assignOrderItemAction } from '@/app/actions/assign-order-item'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<{
  rol: 'supervisor' | 'admin' | 'capturacion'
  empleadoId: number | null
}> = {}) {
  return {
    userId: 1,
    rol: 'supervisor' as const,
    codigoEmpleado: 'SUP001',
    nombreCompleto: 'Supervisor Test',
    empleadoId: 9,
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    ...overrides,
  }
}

function makeFormData(fields: Record<string, string | string[]>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      for (const v of value) fd.append(key, v)
    } else {
      fd.append(key, value)
    }
  }
  return fd
}

// FormData mínimo para un ítem, sea nuevo (id=0, desde QB) o existente — ambos
// casos ahora pasan por el mismo upsert del árbol completo.
function itemForm(overrides: Record<string, string | string[]> = {}) {
  return makeFormData({
    orderItemId: '0',
    inspectorIds: ['16', '13'],
    qb_order_consecutive: 'OV-86068',
    qb_order_state: 'open',
    qb_order_client_name: 'Bimbo S.A.',
    qb_order_plant_name: 'Honda Celaya',
    qb_order_region_name: 'Honda',
    qb_quotation_consecutive: 'OV-86068-CO-29462',
    qb_quotation_status: 'cotizacion_pendiente',
    qb_item_part_number: '83600-3BH',
    qb_item_part_name: 'MAT SET FLOOR',
    qb_item_inventory: '500',
    qb_item_inventory_done: '0',
    qb_item_plant_name: 'PQ',
    ...overrides,
  })
}

function mockOk() {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ success: true, data: { order_item: { id: 42 } } }), { status: 201 }),
  )
}

function mockFail(status: number, message?: string) {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ success: false, message }), { status }),
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('assignOrderItemAction', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'app-token'
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ── Autenticación y autorización ──────────────────────────────────────────

  it('sin sesión → error de expiración', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const result = await assignOrderItemAction(undefined, itemForm())
    expect(result).toEqual({ ok: false, error: 'Sesión expirada. Por favor inicia sesión nuevamente.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rol capturacion → no autorizado', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession({ rol: 'capturacion' }) as never)
    const result = await assignOrderItemAction(undefined, itemForm())
    expect(result).toEqual({ ok: false, error: 'No autorizado.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rol supervisor → puede asignar', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    mockOk()
    const result = await assignOrderItemAction(undefined, itemForm())
    expect(result).toEqual({ ok: true })
  })

  it('rol admin → puede asignar', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession({ rol: 'admin' }) as never)
    mockOk()
    const result = await assignOrderItemAction(undefined, itemForm())
    expect(result).toEqual({ ok: true })
  })

  // ── Validación de inspectores ─────────────────────────────────────────────

  it('sin inspectorIds → error de selección', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const fd = itemForm({ inspectorIds: [] })
    const result = await assignOrderItemAction(undefined, fd)
    expect(result).toEqual({ ok: false, error: 'Selecciona al menos un inspector.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  // ── Validación de supervisor (empleadoId) ─────────────────────────────────

  it('usuario sin empleadoId → error de empleado no asociado', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession({ empleadoId: null }) as never)
    const result = await assignOrderItemAction(undefined, itemForm())
    expect(result).toEqual({ ok: false, error: 'Tu usuario no tiene un empleado asociado; no puedes asignar.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  // ── Árbol incompleto ───────────────────────────────────────────────────────

  it('sin qb_order_consecutive → error de datos incompletos', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const fd = itemForm({ qb_order_consecutive: '' })
    const result = await assignOrderItemAction(undefined, fd)
    expect(result).toEqual({ ok: false, error: 'Datos de la orden incompletos. Busca la cotización nuevamente.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sin qb_quotation_consecutive → error de datos incompletos', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const fd = itemForm({ qb_quotation_consecutive: '' })
    const result = await assignOrderItemAction(undefined, fd)
    expect(result).toEqual({ ok: false, error: 'Datos de la orden incompletos. Busca la cotización nuevamente.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  // ── Payload enviado a qb_sync ──────────────────────────────────────────────

  it('llama a POST /qb_sync/order-items (upsert del árbol completo)', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    mockOk()
    await assignOrderItemAction(undefined, itemForm())

    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toMatch(/\/qb_sync\/order-items$/)
    expect((options as RequestInit).method).toBe('POST')
  })

  it('body contiene order, quotation, orderItem e inspectionSession con id_supervisor/id_inspectores', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession({ empleadoId: 9 }) as never)
    mockOk()
    await assignOrderItemAction(undefined, itemForm())

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string) as {
      order: { consecutive_number: string }
      quotation: { consecutive_number: string }
      orderItem: { part_number: string | null; inventory: number }
      inspectionSession: { id_supervisor: string; id_inspectores: string[] }
    }
    expect(body.order.consecutive_number).toBe('OV-86068')
    expect(body.quotation.consecutive_number).toBe('OV-86068-CO-29462')
    expect(body.orderItem.part_number).toBe('83600-3BH')
    expect(body.orderItem.inventory).toBe(500)
    expect(body.inspectionSession.id_supervisor).toBe('9')
    expect(body.inspectionSession.id_inspectores).toEqual(['16', '13'])
  })

  it('cabeceras incluyen X-App-Token y Authorization', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    mockOk()
    await assignOrderItemAction(undefined, itemForm())

    const headers = vi.mocked(fetch).mock.calls[0][1]!.headers as Record<string, string>
    expect(headers['X-App-Token']).toBe('app-token')
    expect(headers['Authorization']).toBe('Bearer access-token-123')
  })

  it('parte con part_number vacío → lo envía como null', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    mockOk()
    await assignOrderItemAction(undefined, itemForm({ qb_item_part_number: '' }))

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string) as {
      orderItem: { part_number: string | null }
    }
    expect(body.orderItem.part_number).toBeNull()
  })

  // ── Manejo de errores de qb_sync ─────────────────────────────────────────

  it('qb_sync 409 con mensaje → devuelve el mensaje del servidor', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    mockFail(409, 'El inspector ya tiene una sesión activa.')
    const result = await assignOrderItemAction(undefined, itemForm())
    expect(result).toEqual({ ok: false, error: 'El inspector ya tiene una sesión activa.' })
  })

  it('qb_sync 409 sin mensaje → mensaje genérico de conflicto', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 409 }))
    const result = await assignOrderItemAction(undefined, itemForm())
    expect(result).toEqual({ ok: false, error: 'No se pudo asignar (conflicto de sesión o reporte existente).' })
  })

  it('qb_sync 403 con mensaje → devuelve el mensaje', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    mockFail(403, 'No autorizado en esta planta.')
    const result = await assignOrderItemAction(undefined, itemForm())
    expect(result).toEqual({ ok: false, error: 'No autorizado en esta planta.' })
  })

  it('qb_sync 404 con mensaje → devuelve el mensaje', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    mockFail(404, 'Item de orden no encontrado.')
    const result = await assignOrderItemAction(undefined, itemForm())
    expect(result).toEqual({ ok: false, error: 'Item de orden no encontrado.' })
  })

  it('qb_sync 500 sin mensaje → mensaje genérico de error', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 500 }))
    const result = await assignOrderItemAction(undefined, itemForm())
    expect(result).toEqual({ ok: false, error: 'Error al asignar el inspector.' })
  })

  it('error de red (fetch lanza) → error de conexión', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
    const result = await assignOrderItemAction(undefined, itemForm())
    expect(result).toEqual({ ok: false, error: 'No se pudo conectar con el servidor. Intenta nuevamente.' })
  })

  // ── otherItems ─────────────────────────────────────────────────────────────

  it('con otherItems → los incluye en el body del POST', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    mockOk()

    const otherItems = [
      {
        quotation: {
          consecutive_number: 'OV-86068-CO-99999',
          client_email: 'cliente@bimbo.com',
          status: 'cotizacion_pendiente',
          purchase_order_number: 'PO-001',
          contact_emails: 'contacto@bimbo.com',
          order_user_name: 'Juan Perez',
        },
        orderItem: {
          part_number: '12345-AB',
          part_name: 'BRACKET SOPORTE',
          inventory: 200,
          inventory_done: 0,
          plant_name: 'Honda Celaya',
        },
      },
    ]

    const fd = itemForm({ otherItems: JSON.stringify(otherItems) })
    await assignOrderItemAction(undefined, fd)

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string) as {
      otherItems: typeof otherItems
    }
    expect(body.otherItems).toHaveLength(1)
    expect(body.otherItems[0].quotation.consecutive_number).toBe('OV-86068-CO-99999')
    expect(body.otherItems[0].orderItem.part_number).toBe('12345-AB')
  })

  it('sin otherItems → el body NO contiene la clave otherItems', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    mockOk()
    await assignOrderItemAction(undefined, itemForm())

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string) as Record<string, unknown>
    expect(body).not.toHaveProperty('otherItems')
  })

  it('con otherItems vacío ([]) → el body NO contiene la clave otherItems', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    mockOk()
    const fd = itemForm({ otherItems: '[]' })
    await assignOrderItemAction(undefined, fd)

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string) as Record<string, unknown>
    expect(body).not.toHaveProperty('otherItems')
  })

  it('con otherItems JSON inválido → se ignora y el body NO contiene la clave otherItems', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    mockOk()
    const fd = itemForm({ otherItems: '{not valid json' })
    await assignOrderItemAction(undefined, fd)

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string) as Record<string, unknown>
    expect(body).not.toHaveProperty('otherItems')
  })
})
