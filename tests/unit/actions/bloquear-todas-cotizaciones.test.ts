// tests/unit/actions/bloquear-todas-cotizaciones.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

import { getSession } from '@/back/services/session'
import { bloquearTodasCotizacionesAction } from '@/app/actions/bloquear-todas-cotizaciones'

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Rol = 'admin' | 'supervisor' | 'capturacion' | 'lider' | 'servicio_cliente' | 'cliente'

function makeSession(rol: Rol = 'admin') {
  return {
    userId: 1,
    rol,
    codigoEmpleado: 'EMP001',
    nombreCompleto: 'Usuario Prueba',
    plantaId: null,
    plantaNombre: null,
    accessToken: 'admin-token',
    refreshToken: 'refresh-token',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  }
}

function okResponse(count = 5) {
  return new Response(
    JSON.stringify({ success: true, data: { count } }),
    { status: 200 },
  )
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('bloquearTodasCotizacionesAction', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'app-token'
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sin sesión → { ok: false, error de autorización }, fetch no llamado', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const result = await bloquearTodasCotizacionesAction(undefined, new FormData())

    expect(result).toEqual({ ok: false, error: 'Sesión expirada o permisos insuficientes.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('capturacion (sin cotizaciones.bloquear) → { ok: false, error de autorización }, fetch no llamado', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('capturacion'))

    const result = await bloquearTodasCotizacionesAction(undefined, new FormData())

    expect(result).toEqual({ ok: false, error: 'Sesión expirada o permisos insuficientes.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('supervisor (sin cotizaciones.bloquear) → { ok: false, error de autorización }, fetch no llamado', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('supervisor'))

    const result = await bloquearTodasCotizacionesAction(undefined, new FormData())

    expect(result).toEqual({ ok: false, error: 'Sesión expirada o permisos insuficientes.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('admin → éxito → { ok: true, count: 5 }', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('admin'))
    vi.mocked(fetch).mockResolvedValueOnce(okResponse(5))

    const result = await bloquearTodasCotizacionesAction(undefined, new FormData())

    expect(result).toEqual({ ok: true, count: 5 })
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('servicio_cliente (tiene cotizaciones.bloquear) → éxito → { ok: true, count: 3 }', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('servicio_cliente'))
    vi.mocked(fetch).mockResolvedValueOnce(okResponse(3))

    const result = await bloquearTodasCotizacionesAction(undefined, new FormData())

    expect(result).toEqual({ ok: true, count: 3 })
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('llama al endpoint correcto con método PATCH y cuerpo {}', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('admin'))
    vi.mocked(fetch).mockResolvedValueOnce(okResponse(2))

    await bloquearTodasCotizacionesAction(undefined, new FormData())

    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('/qb_sync/quotations/bloquear-todas')
    expect((options as RequestInit).method).toBe('PATCH')
    expect(JSON.parse((options as RequestInit).body as string)).toEqual({})
  })

  it('envía headers X-App-Token y Authorization correctos', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('admin'))
    vi.mocked(fetch).mockResolvedValueOnce(okResponse(1))

    await bloquearTodasCotizacionesAction(undefined, new FormData())

    const [, options] = vi.mocked(fetch).mock.calls[0]
    const headers = (options as RequestInit).headers as Record<string, string>
    expect(headers['X-App-Token']).toBe('app-token')
    expect(headers['Authorization']).toBe('Bearer admin-token')
  })

  it('qb_sync responde error con mensaje → { ok: false, error: mensaje }', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('admin'))
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'No autorizado en backend' }), { status: 403 }),
    )

    const result = await bloquearTodasCotizacionesAction(undefined, new FormData())

    expect(result).toEqual({ ok: false, error: 'No autorizado en backend' })
  })

  it('qb_sync error sin mensaje → mensaje genérico "Error al bloquear."', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('admin'))
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 500 }))

    const result = await bloquearTodasCotizacionesAction(undefined, new FormData())

    expect(result).toEqual({ ok: false, error: 'Error al bloquear.' })
  })

  it('fetch lanza excepción de red → { ok: false, error: "No se pudo conectar..." }', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('admin'))
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const result = await bloquearTodasCotizacionesAction(undefined, new FormData())

    expect(result).toEqual({ ok: false, error: 'No se pudo conectar con el servidor.' })
  })

  it('count no presente en respuesta → count 0 con ok: true', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('admin'))
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    )

    const result = await bloquearTodasCotizacionesAction(undefined, new FormData())

    expect(result).toEqual({ ok: true, count: 0 })
  })
})
