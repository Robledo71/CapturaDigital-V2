// tests/unit/services/promoteService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { promoverOrdenInformal } from '@/back/services/promoteService'

const ACCESS_TOKEN = 'test-token'

describe('promoteService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'app-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('promoverOrdenInformal', () => {
    it('POST exitoso → { ok: true }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), { status: 200 }),
      )

      const result = await promoverOrdenInformal({ itemOrdenInformalId: 10, itemOrdenId: 55 }, ACCESS_TOKEN)

      expect(result).toEqual({ ok: true })
      const [url, options] = vi.mocked(fetch).mock.calls[0]
      expect(String(url)).toBe('http://localhost:3001/qb_sync/informal-orders/10/promote')
      expect((options as RequestInit).method).toBe('POST')
      const headers = (options as RequestInit).headers as Record<string, string>
      expect(headers['X-App-Token']).toBe('app-token')
      expect(headers['Authorization']).toBe('Bearer test-token')
      const body = JSON.parse((options as RequestInit).body as string)
      expect(body).toEqual({ item_orden_id: 55 })
    })

    it('403 con mensaje → reason forbidden con el mensaje del servidor', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: 'No eres el supervisor de las sesiones de este item — no puedes promoverlo.' }),
          { status: 403 },
        ),
      )

      const result = await promoverOrdenInformal({ itemOrdenInformalId: 10, itemOrdenId: 55 }, ACCESS_TOKEN)

      expect(result).toEqual({
        ok: false,
        reason: 'forbidden',
        error: 'No eres el supervisor de las sesiones de este item — no puedes promoverlo.',
      })
    })

    it('404 con mensaje → reason not_found con el mensaje del servidor', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Item de orden informal no encontrado.' }), { status: 404 }),
      )

      const result = await promoverOrdenInformal({ itemOrdenInformalId: 999, itemOrdenId: 55 }, ACCESS_TOKEN)

      expect(result).toEqual({ ok: false, reason: 'not_found', error: 'Item de orden informal no encontrado.' })
    })

    it('404 sin mensaje → reason not_found con mensaje genérico', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 404 }))

      const result = await promoverOrdenInformal({ itemOrdenInformalId: 999, itemOrdenId: 55 }, ACCESS_TOKEN)

      expect(result).toEqual({ ok: false, reason: 'not_found', error: 'Item no encontrado.' })
    })

    it('409 con mensaje → reason invalid con el mensaje del servidor', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Esta orden informal ya fue promovida.' }), { status: 409 }),
      )

      const result = await promoverOrdenInformal({ itemOrdenInformalId: 10, itemOrdenId: 55 }, ACCESS_TOKEN)

      expect(result).toEqual({ ok: false, reason: 'invalid', error: 'Esta orden informal ya fue promovida.' })
    })

    it('400 sin mensaje → reason invalid con mensaje genérico', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 400 }))

      const result = await promoverOrdenInformal({ itemOrdenInformalId: 10, itemOrdenId: 55 }, ACCESS_TOKEN)

      expect(result.ok).toBe(false)
      expect(!result.ok && result.reason).toBe('invalid')
    })

    it('500 sin mensaje → reason error con mensaje genérico', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 500 }))

      const result = await promoverOrdenInformal({ itemOrdenInformalId: 10, itemOrdenId: 55 }, ACCESS_TOKEN)

      expect(result).toEqual({ ok: false, reason: 'error', error: 'No se pudo promover la orden informal.' })
    })

    it('error de red (fetch lanza) → reason error de conexión', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const result = await promoverOrdenInformal({ itemOrdenInformalId: 10, itemOrdenId: 55 }, ACCESS_TOKEN)

      expect(result).toEqual({
        ok: false,
        reason: 'error',
        error: 'No se pudo conectar con el servidor. Intenta nuevamente.',
      })
    })
  })
})
