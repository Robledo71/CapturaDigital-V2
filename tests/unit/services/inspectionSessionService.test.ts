// tests/unit/services/inspectionSessionService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { desasignarInspector } from '@/back/services/inspectionSessionService'

const ACCESS_TOKEN = 'test-token'

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
})
