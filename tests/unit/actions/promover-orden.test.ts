// tests/unit/actions/promover-orden.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { getSession } from '@/back/services/session'
import { revalidatePath } from 'next/cache'
import {
  getOrdenesInformalesParaPromoverAction,
  promoverOrdenInformalAction,
} from '@/app/actions/promover-orden'

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

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.append(key, value)
  return fd
}

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
    fecha_creado: '2026-07-20T10:00:00.000Z',
    inspectores: [],
    estado_reporte: null,
    ...overrides,
  }
}

describe('promover-orden actions', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'app-token'
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ── getOrdenesInformalesParaPromoverAction ──────────────────────────────────

  describe('getOrdenesInformalesParaPromoverAction', () => {
    it('sin sesión → []', async () => {
      vi.mocked(getSession).mockResolvedValue(null)
      const result = await getOrdenesInformalesParaPromoverAction()
      expect(result).toEqual([])
      expect(fetch).not.toHaveBeenCalled()
    })

    it('rol capturacion (sin reportes_informales.promover) → []', async () => {
      vi.mocked(getSession).mockResolvedValue(makeSession({ rol: 'capturacion' }) as never)
      const result = await getOrdenesInformalesParaPromoverAction()
      expect(result).toEqual([])
      expect(fetch).not.toHaveBeenCalled()
    })

    it('rol supervisor (con permiso) → devuelve las órdenes informales mapeadas', async () => {
      vi.mocked(getSession).mockResolvedValue(makeSession() as never)
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: [makeExternalOrder()] }), { status: 200 }),
      )

      const result = await getOrdenesInformalesParaPromoverAction()

      expect(result).toHaveLength(1)
      expect(result[0].itemOrdenInformalId).toBe(10)
      expect(result[0].numeroParte).toBe('83600-3BH')
    })

    it('la API falla → []', async () => {
      vi.mocked(getSession).mockResolvedValue(makeSession() as never)
      vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 500 }))

      const result = await getOrdenesInformalesParaPromoverAction()
      expect(result).toEqual([])
    })
  })

  // ── promoverOrdenInformalAction ─────────────────────────────────────────────

  describe('promoverOrdenInformalAction', () => {
    it('sin sesión → error de expiración', async () => {
      vi.mocked(getSession).mockResolvedValue(null)
      const result = await promoverOrdenInformalAction(
        undefined,
        makeFormData({ itemOrdenInformalId: '10', itemOrdenId: '55' }),
      )
      expect(result).toEqual({ ok: false, error: 'Sesión expirada. Por favor inicia sesión nuevamente.' })
      expect(fetch).not.toHaveBeenCalled()
    })

    it('rol capturacion (sin permiso) → no autorizado', async () => {
      vi.mocked(getSession).mockResolvedValue(makeSession({ rol: 'capturacion' }) as never)
      const result = await promoverOrdenInformalAction(
        undefined,
        makeFormData({ itemOrdenInformalId: '10', itemOrdenId: '55' }),
      )
      expect(result).toEqual({ ok: false, error: 'No autorizado.' })
      expect(fetch).not.toHaveBeenCalled()
    })

    it('datos incompletos (itemOrdenInformalId inválido) → error de datos incompletos', async () => {
      vi.mocked(getSession).mockResolvedValue(makeSession() as never)
      const result = await promoverOrdenInformalAction(
        undefined,
        makeFormData({ itemOrdenInformalId: '0', itemOrdenId: '55' }),
      )
      expect(result).toEqual({ ok: false, error: 'Datos incompletos.' })
      expect(fetch).not.toHaveBeenCalled()
    })

    it('datos incompletos (ordenId inválido) → error de datos incompletos', async () => {
      vi.mocked(getSession).mockResolvedValue(makeSession() as never)
      const result = await promoverOrdenInformalAction(
        undefined,
        makeFormData({ itemOrdenInformalId: '10', itemOrdenId: '' }),
      )
      expect(result).toEqual({ ok: false, error: 'Datos incompletos.' })
      expect(fetch).not.toHaveBeenCalled()
    })

    it('éxito → { ok: true } y revalida las rutas de carga de trabajo', async () => {
      vi.mocked(getSession).mockResolvedValue(makeSession() as never)
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))

      const result = await promoverOrdenInformalAction(
        undefined,
        makeFormData({ itemOrdenInformalId: '10', itemOrdenId: '55' }),
      )

      expect(result).toEqual({ ok: true })
      expect(revalidatePath).toHaveBeenCalledWith('/supervisor/carga-trabajo')
      expect(revalidatePath).toHaveBeenCalledWith('/gerente/ordenes')
    })

    it('qb_sync 404 → devuelve el mensaje de not_found sin revalidar', async () => {
      vi.mocked(getSession).mockResolvedValue(makeSession() as never)
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'No encontrada.' }), { status: 404 }),
      )

      const result = await promoverOrdenInformalAction(
        undefined,
        makeFormData({ itemOrdenInformalId: '999', itemOrdenId: '55' }),
      )

      expect(result).toEqual({ ok: false, error: 'No encontrada.' })
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('error de red (fetch lanza) → error de conexión', async () => {
      vi.mocked(getSession).mockResolvedValue(makeSession() as never)
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const result = await promoverOrdenInformalAction(
        undefined,
        makeFormData({ itemOrdenInformalId: '10', itemOrdenId: '55' }),
      )

      expect(result).toEqual({ ok: false, error: 'No se pudo conectar con el servidor. Intenta nuevamente.' })
    })
  })
})
