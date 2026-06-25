import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

import { getSession } from '@/back/services/session'
import { assignOrderItemAction } from '@/app/actions/assign-order-item'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSession(rol: 'supervisor' | 'admin' | 'capturacion' = 'supervisor') {
  return {
    userId: 1,
    rol,
    codigoEmpleado: 'SUP001',
    nombreCompleto: 'Supervisor Test',
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  }
}

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.append(key, value)
  return fd
}

// FormData mínimo para un ítem EXISTENTE en BD
function existingItemForm(orderItemId: number, tabletId = '3', codigoTablet = 'TAB-001') {
  return makeFormData({
    orderItemId: String(orderItemId),
    tabletId: `${tabletId}:${codigoTablet}`,
  })
}

// FormData mínimo para un ítem NUEVO (viene de QB search, orderItemId === 0)
function newItemForm(overrides: Record<string, string> = {}) {
  return makeFormData({
    orderItemId: '0',
    tabletId: '3:TAB-001',
    qb_order_id: '86068',
    qb_order_consecutive: 'OV-86068',
    qb_order_state: 'open',
    qb_order_client_name: 'Bimbo S.A.',
    qb_order_plant_name: 'Honda Celaya',
    qb_order_region_name: 'Honda',
    qb_quotation_id: '147029',
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
    const result = await assignOrderItemAction(undefined, existingItemForm(1))
    expect(result).toEqual({ ok: false, error: 'Sesión expirada. Por favor inicia sesión nuevamente.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rol capturacion → no autorizado', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('capturacion'))
    const result = await assignOrderItemAction(undefined, existingItemForm(1))
    expect(result).toEqual({ ok: false, error: 'No autorizado.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rol supervisor → puede asignar', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('supervisor'))
    mockOk()
    const result = await assignOrderItemAction(undefined, existingItemForm(1))
    expect(result).toEqual({ ok: true })
  })

  it('rol admin → puede asignar', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('admin'))
    mockOk()
    const result = await assignOrderItemAction(undefined, existingItemForm(1))
    expect(result).toEqual({ ok: true })
  })

  // ── Validación de tablet ──────────────────────────────────────────────────

  it('tabletId sin ":" → error de selección', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    const fd = makeFormData({ orderItemId: '1', tabletId: '3' }) // falta el ":"
    const result = await assignOrderItemAction(undefined, fd)
    expect(result).toEqual({ ok: false, error: 'Selecciona una tablet.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('tabletId con ":" pero sin código → error de selección', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    const fd = makeFormData({ orderItemId: '1', tabletId: '3:' }) // código vacío
    const result = await assignOrderItemAction(undefined, fd)
    expect(result).toEqual({ ok: false, error: 'Selecciona una tablet.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('tabletId ausente → error de selección', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    const fd = makeFormData({ orderItemId: '1' }) // sin tabletId
    const result = await assignOrderItemAction(undefined, fd)
    expect(result).toEqual({ ok: false, error: 'Selecciona una tablet.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  // ── Ítem EXISTENTE (isNewItem = false) ────────────────────────────────────

  it('ítem existente → llama a POST /qb_sync/order-items/:id/session', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    mockOk()
    await assignOrderItemAction(undefined, existingItemForm(42, '5', 'TAB-005'))

    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('/qb_sync/order-items/42/session')
    expect((options as RequestInit).method).toBe('POST')
  })

  it('ítem existente → body tiene supervisor, tablet y status assigned', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    mockOk()
    await assignOrderItemAction(undefined, existingItemForm(10, '2', 'TAB-002'))

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string) as {
      id_supervisor: string
      id_tablet: string
      status: string
    }
    expect(body.id_supervisor).toBe('SUP001')
    expect(body.id_tablet).toBe('TAB-002')
    expect(body.status).toBe('assigned')
  })

  it('ítem existente → cabeceras incluyen X-App-Token y Authorization', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    mockOk()
    await assignOrderItemAction(undefined, existingItemForm(7))

    const headers = vi.mocked(fetch).mock.calls[0][1]!.headers as Record<string, string>
    expect(headers['X-App-Token']).toBe('app-token')
    expect(headers['Authorization']).toBe('Bearer access-token-123')
  })

  it('ítem existente → éxito retorna { ok: true }', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    mockOk()
    const result = await assignOrderItemAction(undefined, existingItemForm(5))
    expect(result).toEqual({ ok: true })
  })

  // ── Ítem NUEVO desde QB search (isNewItem = true) ─────────────────────────

  it('ítem nuevo → llama a POST /qb_sync/order-items (sin ID en la ruta)', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    mockOk()
    await assignOrderItemAction(undefined, newItemForm())

    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toMatch(/\/qb_sync\/order-items$/)
  })

  it('ítem nuevo → body contiene order, quotation, orderItem e inspectionSession', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    mockOk()
    await assignOrderItemAction(undefined, newItemForm())

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string) as {
      order: { consecutive_number: string }
      quotation: { consecutive_number: string }
      orderItem: { part_number: string | null; inventory: number }
      inspectionSession: { id_supervisor: string; id_tablet: string; status: string }
    }
    expect(body.order.consecutive_number).toBe('OV-86068')
    expect(body.quotation.consecutive_number).toBe('OV-86068-CO-29462')
    expect(body.orderItem.part_number).toBe('83600-3BH')
    expect(body.orderItem.inventory).toBe(500)
    expect(body.inspectionSession.id_supervisor).toBe('SUP001')
    expect(body.inspectionSession.id_tablet).toBe('TAB-001')
    expect(body.inspectionSession.status).toBe('assigned')
  })

  it('ítem nuevo sin qb_order_id → error de datos incompletos', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    const fd = newItemForm({ qb_order_id: '' })
    const result = await assignOrderItemAction(undefined, fd)
    expect(result).toEqual({ ok: false, error: 'Datos de la orden incompletos. Busca la cotización nuevamente.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('ítem nuevo sin qb_quotation_id → error de datos incompletos', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    const fd = newItemForm({ qb_quotation_id: '' })
    const result = await assignOrderItemAction(undefined, fd)
    expect(result).toEqual({ ok: false, error: 'Datos de la orden incompletos. Busca la cotización nuevamente.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('ítem nuevo con part_number vacío → lo envía como null', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    mockOk()
    await assignOrderItemAction(undefined, newItemForm({ qb_item_part_number: '' }))

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string) as {
      orderItem: { part_number: string | null }
    }
    expect(body.orderItem.part_number).toBeNull()
  })

  // ── Manejo de errores de qb_sync ─────────────────────────────────────────

  it('qb_sync 409 con mensaje → devuelve el mensaje del servidor', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    mockFail(409, 'Este item ya tiene una tablet asignada activamente.')
    const result = await assignOrderItemAction(undefined, existingItemForm(1))
    expect(result).toEqual({ ok: false, error: 'Este item ya tiene una tablet asignada activamente.' })
  })

  it('qb_sync 409 sin mensaje → mensaje genérico de doble asignación', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 409 }))
    const result = await assignOrderItemAction(undefined, existingItemForm(1))
    expect(result).toEqual({ ok: false, error: 'Este item ya tiene una tablet asignada.' })
  })

  it('qb_sync 404 con mensaje → devuelve el mensaje', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    mockFail(404, 'Item de orden 99 no encontrado.')
    const result = await assignOrderItemAction(undefined, existingItemForm(99))
    expect(result).toEqual({ ok: false, error: 'Item de orden 99 no encontrado.' })
  })

  it('qb_sync 500 sin mensaje → mensaje genérico de error', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 500 }))
    const result = await assignOrderItemAction(undefined, existingItemForm(1))
    expect(result).toEqual({ ok: false, error: 'Error al asignar la tablet.' })
  })

  it('error de red (fetch lanza) → error de conexión', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
    const result = await assignOrderItemAction(undefined, existingItemForm(1))
    expect(result).toEqual({ ok: false, error: 'No se pudo conectar con el servidor. Intenta nuevamente.' })
  })

  // ── otherItems — primera asignación (orderItemId === 0) ───────────────────

  it('ítem nuevo con otherItems → los incluye en el body del POST', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
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

    const fd = newItemForm({ otherItems: JSON.stringify(otherItems) })
    await assignOrderItemAction(undefined, fd)

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string) as {
      otherItems: typeof otherItems
    }
    expect(body.otherItems).toHaveLength(1)
    expect(body.otherItems[0].quotation.consecutive_number).toBe('OV-86068-CO-99999')
    expect(body.otherItems[0].quotation.client_email).toBe('cliente@bimbo.com')
    expect(body.otherItems[0].orderItem.part_number).toBe('12345-AB')
    expect(body.otherItems[0].orderItem.inventory).toBe(200)
    expect(body.otherItems[0].orderItem.plant_name).toBe('Honda Celaya')
  })

  it('ítem nuevo sin otherItems → el body NO contiene la clave otherItems', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    mockOk()
    await assignOrderItemAction(undefined, newItemForm()) // sin campo otherItems

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string) as Record<string, unknown>
    expect(body).not.toHaveProperty('otherItems')
  })

  it('ítem nuevo con otherItems vacío ([]) → el body NO contiene la clave otherItems', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    mockOk()
    const fd = newItemForm({ otherItems: '[]' })
    await assignOrderItemAction(undefined, fd)

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string) as Record<string, unknown>
    expect(body).not.toHaveProperty('otherItems')
  })

  it('ítem nuevo con otherItems JSON inválido → se ignora y el body NO contiene la clave otherItems', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    mockOk()
    const fd = newItemForm({ otherItems: '{not valid json' })
    await assignOrderItemAction(undefined, fd)

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string) as Record<string, unknown>
    expect(body).not.toHaveProperty('otherItems')
  })

  it('ítem EXISTENTE (id!=0) con otherItems en form → el body NO contiene la clave otherItems', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    mockOk()

    // Ítem existente usa POST /order-items/:id/session, no el upsert → otherItems nunca aplica
    const fd = existingItemForm(42)
    fd.append('otherItems', JSON.stringify([{ quotation: { consecutive_number: 'CO-001' }, orderItem: {} }]))
    await assignOrderItemAction(undefined, fd)

    // La ruta usada es la de sesión individual, no el upsert
    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('/qb_sync/order-items/42/session')
    const body = JSON.parse((options as RequestInit).body as string) as Record<string, unknown>
    expect(body).not.toHaveProperty('otherItems')
  })
})
