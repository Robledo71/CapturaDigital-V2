// tests/unit/services/informalOrdersService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getInformalOrders,
  createInformalOrder,
  assignInformalSession,
} from '@/back/services/informalOrdersService'

const ACCESS_TOKEN = 'test-access-token'

function makeExternalOrder(overrides: Record<string, unknown> = {}) {
  return {
    orden_informal_id: 1,
    tipo_orden: 'OV',
    cliente_id: 5,
    cliente_nombre: 'Bimbo S.A.',
    item_orden_informal_id: 10,
    numero_parte: '83600-3BH',
    nombre_parte: 'MAT SET FLOOR',
    planta_id: 2,
    planta_nombre: 'Honda Celaya',
    solicitante_nombre: 'Juan Perez',
    inspectores: [{ id: 7, name: 'Ana Lopez' }],
    estado_reporte: null,
    ...overrides,
  }
}

describe('informalOrdersService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'app-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ─── getInformalOrders ────────────────────────────────────────────────────

  describe('getInformalOrders', () => {
    it('fetch exitoso mapea filas snake_case → camelCase', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: [makeExternalOrder()] }), { status: 200 }),
      )

      const result = await getInformalOrders(ACCESS_TOKEN)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        ordenInformalId: 1,
        itemOrdenInformalId: 10,
        tipoOrden: 'OV',
        clienteId: 5,
        clienteNombre: 'Bimbo S.A.',
        plantaId: 2,
        plantaNombre: 'Honda Celaya',
        numeroParte: '83600-3BH',
        nombreParte: 'MAT SET FLOOR',
        solicitanteNombre: 'Juan Perez',
        inspectores: [{ id: 7, name: 'Ana Lopez' }],
        estadoReporte: null,
      })
    })

    it('sin inspectores en la respuesta → mapea a arreglo vacío', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, data: [makeExternalOrder({ inspectores: null })] }),
          { status: 200 },
        ),
      )

      const result = await getInformalOrders(ACCESS_TOKEN)
      expect(result[0].inspectores).toEqual([])
    })

    it('respuesta no-ok lanza error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))

      await expect(getInformalOrders(ACCESS_TOKEN)).rejects.toThrow('API responded 401')
    })

    it('envía cabeceras X-App-Token y Authorization', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: [] }), { status: 200 }),
      )

      await getInformalOrders(ACCESS_TOKEN)

      const headers = vi.mocked(fetch).mock.calls[0][1]!.headers as Record<string, string>
      expect(headers['X-App-Token']).toBe('app-token')
      expect(headers['Authorization']).toBe('Bearer test-access-token')
    })
  })

  // ─── createInformalOrder ──────────────────────────────────────────────────

  describe('createInformalOrder', () => {
    const input = {
      tipoOrden: 'OV' as const,
      clienteId: 5,
      item: { numeroParte: '83600-3BH', plantaId: 2 },
    }

    it('fetch 201 devuelve { ok: true, data }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { orden_informal: { id: 1 } } }), { status: 201 }),
      )

      const result = await createInformalOrder(input, ACCESS_TOKEN)
      expect(result.ok).toBe(true)
    })

    it('envía tipo_orden, cliente_id e item en el body', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: {} }), { status: 201 }),
      )

      await createInformalOrder(input, ACCESS_TOKEN)

      const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)
      expect(body.tipo_orden).toBe('OV')
      expect(body.cliente_id).toBe(5)
      expect(body.item).toEqual({ numero_parte: '83600-3BH', nombre_parte: undefined, planta_id: 2 })
      expect(body).not.toHaveProperty('inspectionSession')
    })

    it('con inspectionSession → lo incluye en el body mapeado a snake_case', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: {} }), { status: 201 }),
      )

      await createInformalOrder(
        { ...input, inspectionSession: { idSupervisor: '9', idInspectores: ['1', '2'] } },
        ACCESS_TOKEN,
      )

      const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)
      expect(body.inspectionSession).toEqual({ id_supervisor: '9', id_inspectores: ['1', '2'] })
    })

    it('fetch 403 con mensaje → devuelve el mensaje del backend', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false, message: 'No autorizado en esta planta.' }), { status: 403 }),
      )

      const result = await createInformalOrder(input, ACCESS_TOKEN)
      expect(result).toEqual({ ok: false, error: 'No autorizado en esta planta.' })
    })

    it('fetch 409 con mensaje → devuelve el mensaje del backend', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false, message: 'Ya existe una orden con ese número de parte.' }), {
          status: 409,
        }),
      )

      const result = await createInformalOrder(input, ACCESS_TOKEN)
      expect(result).toEqual({ ok: false, error: 'Ya existe una orden con ese número de parte.' })
    })

    it('fetch 500 sin mensaje → error genérico', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 500 }))

      const result = await createInformalOrder(input, ACCESS_TOKEN)
      expect(result).toEqual({ ok: false, error: 'No se pudo crear la orden informal.' })
    })

    it('error de red → mensaje de conexión', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const result = await createInformalOrder(input, ACCESS_TOKEN)
      expect(result).toEqual({ ok: false, error: 'No se pudo conectar con el servidor. Intenta nuevamente.' })
    })
  })

  // ─── assignInformalSession ────────────────────────────────────────────────

  describe('assignInformalSession', () => {
    const input = { idSupervisor: '9', idInspectores: ['1', '2'] }

    it('fetch 201 devuelve { ok: true }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: {} }), { status: 201 }),
      )

      const result = await assignInformalSession(10, input, ACCESS_TOKEN)
      expect(result).toEqual({ ok: true })
    })

    it('llama a POST /qb_sync/informal-orders/:itemId/session con id_supervisor/id_inspectores', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: {} }), { status: 201 }),
      )

      await assignInformalSession(10, input, ACCESS_TOKEN)

      const [url, options] = vi.mocked(fetch).mock.calls[0]
      expect(String(url)).toMatch(/\/qb_sync\/informal-orders\/10\/session$/)
      expect((options as RequestInit).method).toBe('POST')
      const body = JSON.parse((options as RequestInit).body as string)
      expect(body).toEqual({ id_supervisor: '9', id_inspectores: ['1', '2'] })
    })

    it('fetch 409 con mensaje → devuelve el mensaje del backend', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false, message: 'El inspector ya tiene una sesión activa.' }), {
          status: 409,
        }),
      )

      const result = await assignInformalSession(10, input, ACCESS_TOKEN)
      expect(result).toEqual({ ok: false, error: 'El inspector ya tiene una sesión activa.' })
    })

    it('fetch 403 sin mensaje → error genérico de autorización', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 403 }))

      const result = await assignInformalSession(10, input, ACCESS_TOKEN)
      expect(result).toEqual({ ok: false, error: 'No autorizado para asignar inspectores a este item.' })
    })
  })
})
