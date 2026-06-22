// tests/unit/actions/desbloquear-cotizacion.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

import { getSession } from '@/back/services/session'
import { desbloquearCotizacionAction } from '@/app/actions/desbloquear-cotizacion'

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

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value)
  }
  return fd
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('desbloquearCotizacionAction', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'app-token'
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sin sesión → { ok: false, error de autorización }', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const fd = makeFormData({ cotizacionId: '5', desbloqueado: 'true' })

    const result = await desbloquearCotizacionAction(undefined, fd)
    expect(result).toEqual({ ok: false, error: 'Sesión expirada o permisos insuficientes.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('capturacion → desbloquear RECHAZADO (perdió el permiso en el flip)', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('capturacion'))
    const fd = makeFormData({ cotizacionId: '5', desbloqueado: 'true' })

    const result = await desbloquearCotizacionAction(undefined, fd)
    expect(result).toEqual({ ok: false, error: 'Sesión expirada o permisos insuficientes.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('supervisor → desbloquear RECHAZADO (perdió el permiso en el flip)', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('supervisor'))
    const fd = makeFormData({ cotizacionId: '5', desbloqueado: 'true' })

    const result = await desbloquearCotizacionAction(undefined, fd)
    expect(result).toEqual({ ok: false, error: 'Sesión expirada o permisos insuficientes.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('servicio_cliente → desbloquear PERMITIDO', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('servicio_cliente'))
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    )
    const fd = makeFormData({ cotizacionId: '10', desbloqueado: 'true' })

    const result = await desbloquearCotizacionAction(undefined, fd)
    expect(result).toEqual({ ok: true })
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('cotizacionId inválido (NaN) → { ok: false, error: "ID inválido." }', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    const fd = makeFormData({ cotizacionId: 'abc', desbloqueado: 'true' })

    const result = await desbloquearCotizacionAction(undefined, fd)
    expect(result).toEqual({ ok: false, error: 'ID inválido.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('desbloqueo exitoso (desbloqueado=true) → { ok: true }', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    )

    const fd = makeFormData({ cotizacionId: '10', desbloqueado: 'true' })

    const result = await desbloquearCotizacionAction(undefined, fd)
    expect(result).toEqual({ ok: true })

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string) as {
      desbloqueado: boolean
    }
    expect(body.desbloqueado).toBe(true)
  })

  it('bloqueo exitoso (desbloqueado=false) → { ok: true }', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    )

    const fd = makeFormData({ cotizacionId: '10', desbloqueado: 'false' })

    const result = await desbloquearCotizacionAction(undefined, fd)
    expect(result).toEqual({ ok: true })

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string) as {
      desbloqueado: boolean
    }
    expect(body.desbloqueado).toBe(false)
  })

  it('qb_sync responde con error (mensaje en body) → devuelve el mensaje', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ message: 'Cotización no encontrada' }),
        { status: 404 },
      ),
    )

    const fd = makeFormData({ cotizacionId: '99', desbloqueado: 'true' })

    const result = await desbloquearCotizacionAction(undefined, fd)
    expect(result).toEqual({ ok: false, error: 'Cotización no encontrada' })
  })

  it('qb_sync error sin mensaje → mensaje genérico "Error al actualizar."', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('{}', { status: 500 }),
    )

    const fd = makeFormData({ cotizacionId: '5', desbloqueado: 'true' })

    const result = await desbloquearCotizacionAction(undefined, fd)
    expect(result).toEqual({ ok: false, error: 'Error al actualizar.' })
  })

  it('fetch lanza excepción de red → { ok: false, error: "No se pudo conectar..." }', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const fd = makeFormData({ cotizacionId: '5', desbloqueado: 'true' })

    const result = await desbloquearCotizacionAction(undefined, fd)
    expect(result).toEqual({ ok: false, error: 'No se pudo conectar con el servidor.' })
  })

  it('llama al endpoint correcto con el método PATCH', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    )

    const fd = makeFormData({ cotizacionId: '7', desbloqueado: 'true' })
    await desbloquearCotizacionAction(undefined, fd)

    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(url).toContain('/qb_sync/quotations/7/desbloqueado')
    expect((options as RequestInit).method).toBe('PATCH')
  })
})
