// tests/unit/services/inspectionSessionService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { desasignarInspector, descargarOrden } from '@/back/services/inspectionSessionService'
import type { OrderItemTree } from '@/back/services/inspectionSessionService'

const ACCESS_TOKEN = 'test-token'

function makeTree(overrides: Partial<OrderItemTree> = {}): OrderItemTree {
  return {
    order: { consecutive_number: 'OV-86068', state: 'open' },
    quotation: { consecutive_number: 'OV-86068-CO-29462' },
    orderItem: { part_number: '83600-3BH', inventory: 500, inventory_done: 0 },
    ...overrides,
  }
}

describe('inspectionSessionService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'app-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ─── desasignarInspector ────────────────────────────────────────────────────

  describe('desasignarInspector', () => {
    it('DELETE exitoso → { ok: true }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { closed: 1 } }), { status: 200 }),
      )

      const result = await desasignarInspector(42, 16, ACCESS_TOKEN)

      expect(result).toEqual({ ok: true })
      const [url, options] = vi.mocked(fetch).mock.calls[0]
      expect(String(url)).toBe('http://localhost:3001/qb_sync/order-items/42/inspectors/16')
      expect((options as RequestInit).method).toBe('DELETE')
      const headers = (options as RequestInit).headers as Record<string, string>
      expect(headers['X-App-Token']).toBe('app-token')
      expect(headers['Authorization']).toBe('Bearer test-token')
    })

    it('idempotente: closed: 0 con 200 sigue siendo { ok: true }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { closed: 0 } }), { status: 200 }),
      )

      const result = await desasignarInspector(42, 16, ACCESS_TOKEN)

      expect(result).toEqual({ ok: true })
    })

    it('403 con mensaje → mensaje amigable del servidor', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false, message: 'Item de otra planta.' }), { status: 403 }),
      )

      const result = await desasignarInspector(42, 16, ACCESS_TOKEN)

      expect(result).toEqual({ ok: false, error: 'Item de otra planta.' })
    })

    it('403 sin mensaje → mensaje genérico de planta', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 403 }))

      const result = await desasignarInspector(42, 16, ACCESS_TOKEN)

      expect(result).toEqual({ ok: false, error: 'No autorizado para desasignar en esta planta.' })
    })

    it('409 con mensaje → devuelve el mensaje del servidor', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false, message: 'Conflicto al cerrar la sesión.' }), { status: 409 }),
      )

      const result = await desasignarInspector(42, 16, ACCESS_TOKEN)

      expect(result).toEqual({ ok: false, error: 'Conflicto al cerrar la sesión.' })
    })

    it('500 sin mensaje → mensaje genérico', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 500 }))

      const result = await desasignarInspector(42, 16, ACCESS_TOKEN)

      expect(result).toEqual({ ok: false, error: 'No se pudo desasignar al inspector.' })
    })

    it('error de red (fetch lanza) → error de conexión', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const result = await desasignarInspector(42, 16, ACCESS_TOKEN)

      expect(result).toEqual({ ok: false, error: 'No se pudo conectar con el servidor. Intenta nuevamente.' })
    })
  })

  // ─── descargarOrden ─────────────────────────────────────────────────────────

  describe('descargarOrden', () => {
    it('POST exitoso → { ok: true } y el body NO incluye inspectionSession', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { order_item: { id: 42 } } }), { status: 201 }),
      )

      const result = await descargarOrden(makeTree(), ACCESS_TOKEN)

      expect(result).toEqual({ ok: true })
      const [url, options] = vi.mocked(fetch).mock.calls[0]
      expect(String(url)).toBe('http://localhost:3001/qb_sync/order-items')
      expect((options as RequestInit).method).toBe('POST')
      const body = JSON.parse((options as RequestInit).body as string)
      expect(body).not.toHaveProperty('inspectionSession')
      expect(body.order.consecutive_number).toBe('OV-86068')
    })

    it('con otherItems → los incluye en el body', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))

      const otherItems = [
        { quotation: { consecutive_number: 'OV-86068-CO-99999' }, orderItem: { part_number: '12345-AB' } },
      ]
      await descargarOrden(makeTree({ otherItems }), ACCESS_TOKEN)

      const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)
      expect(body.otherItems).toEqual(otherItems)
    })

    it('409 con mensaje → devuelve el mensaje del servidor', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false, message: 'Conflicto al descargar.' }), { status: 409 }),
      )

      const result = await descargarOrden(makeTree(), ACCESS_TOKEN)

      expect(result).toEqual({ ok: false, error: 'Conflicto al descargar.' })
    })

    it('403 sin mensaje → mensaje genérico de autorización', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 403 }))

      const result = await descargarOrden(makeTree(), ACCESS_TOKEN)

      expect(result).toEqual({ ok: false, error: 'No autorizado para descargar esta orden.' })
    })

    it('500 sin mensaje → mensaje genérico', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 500 }))

      const result = await descargarOrden(makeTree(), ACCESS_TOKEN)

      expect(result).toEqual({ ok: false, error: 'No se pudo descargar la orden.' })
    })

    it('error de red (fetch lanza) → error de conexión', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const result = await descargarOrden(makeTree(), ACCESS_TOKEN)

      expect(result).toEqual({ ok: false, error: 'No se pudo conectar con el servidor. Intenta nuevamente.' })
    })
  })
})
