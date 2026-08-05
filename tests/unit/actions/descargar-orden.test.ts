// tests/unit/actions/descargar-orden.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { getSession } from '@/back/services/session'
import { revalidatePath } from 'next/cache'
import { descargarOrdenAction } from '@/app/actions/descargar-orden'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<{ rol: 'supervisor' | 'capturacion' | 'admin' }> = {}) {
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

function makeFormData(fields: Record<string, string> = {}): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.append(key, value)
  return fd
}

function orderForm(overrides: Record<string, string> = {}) {
  return makeFormData({
    qb_order_consecutive: 'OV-86068',
    qb_order_state: 'open',
    qb_order_client_name: 'Bimbo S.A.',
    qb_order_plant_name: 'Honda Celaya',
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

describe('descargarOrdenAction', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'app-token'
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sin sesión → error de expiración', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const result = await descargarOrdenAction(undefined, orderForm())
    expect(result).toEqual({ ok: false, error: 'Sesión expirada. Por favor inicia sesión nuevamente.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rol capturacion (sin cotizaciones.importar) → no autorizado', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession({ rol: 'capturacion' }) as never)
    const result = await descargarOrdenAction(undefined, orderForm())
    expect(result).toEqual({ ok: false, error: 'No autorizado.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rol supervisor (con cotizaciones.importar) → puede descargar', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    mockOk()
    const result = await descargarOrdenAction(undefined, orderForm())
    expect(result).toEqual({ ok: true })
  })

  it('sin qb_order_consecutive → error de datos incompletos', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const result = await descargarOrdenAction(undefined, orderForm({ qb_order_consecutive: '' }))
    expect(result).toEqual({ ok: false, error: 'Datos de la orden incompletos. Busca la cotización nuevamente.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sin qb_quotation_consecutive → error de datos incompletos', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    const result = await descargarOrdenAction(undefined, orderForm({ qb_quotation_consecutive: '' }))
    expect(result).toEqual({ ok: false, error: 'Datos de la orden incompletos. Busca la cotización nuevamente.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('llama a POST /qb_sync/order-items SIN inspectionSession en el body', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    mockOk()
    await descargarOrdenAction(undefined, orderForm())

    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toMatch(/\/qb_sync\/order-items$/)
    expect((options as RequestInit).method).toBe('POST')

    const body = JSON.parse((options as RequestInit).body as string) as Record<string, unknown>
    expect(body).toHaveProperty('order')
    expect(body).toHaveProperty('quotation')
    expect(body).toHaveProperty('orderItem')
    expect(body).not.toHaveProperty('inspectionSession')
  })

  it('con otherItems → los incluye en el body del POST', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    mockOk()

    const otherItems = [
      {
        quotation: { consecutive_number: 'OV-86068-CO-99999' },
        orderItem: { part_number: '12345-AB', part_name: 'BRACKET', inventory: 200, inventory_done: 0, plant_name: 'Honda Celaya' },
      },
    ]
    await descargarOrdenAction(undefined, orderForm({ otherItems: JSON.stringify(otherItems) }))

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string) as { otherItems: typeof otherItems }
    expect(body.otherItems).toHaveLength(1)
    expect(body.otherItems[0].orderItem.part_number).toBe('12345-AB')
  })

  it('revalida las rutas de carga de trabajo tras un éxito', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    mockOk()
    await descargarOrdenAction(undefined, orderForm())

    expect(revalidatePath).toHaveBeenCalledWith('/supervisor/carga-trabajo')
    expect(revalidatePath).toHaveBeenCalledWith('/superusuario/carga-trabajo')
    expect(revalidatePath).toHaveBeenCalledWith('/capturacion/carga-trabajo')
    expect(revalidatePath).toHaveBeenCalledWith('/servicio-cliente/carga-trabajo')
    expect(revalidatePath).toHaveBeenCalledWith('/gerente/ordenes')
  })

  it('no revalida en caso de error', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    mockFail(409, 'Conflicto')
    await descargarOrdenAction(undefined, orderForm())
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('qb_sync 409 con mensaje → devuelve el mensaje del servidor', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    mockFail(409, 'La orden ya existe con datos distintos.')
    const result = await descargarOrdenAction(undefined, orderForm())
    expect(result).toEqual({ ok: false, error: 'La orden ya existe con datos distintos.' })
  })

  it('error de red (fetch lanza) → error de conexión', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
    const result = await descargarOrdenAction(undefined, orderForm())
    expect(result).toEqual({ ok: false, error: 'No se pudo conectar con el servidor. Intenta nuevamente.' })
  })
})
