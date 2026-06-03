// tests/unit/actions/toggle-tablet-status.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

import { getSession } from '@/back/services/session'
import { toggleTabletStatusAction } from '@/app/actions/toggle-tablet-status'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function adminSession() {
  return {
    userId: 1,
    rol: 'admin' as const,
    codigoEmpleado: 'ADMIN001',
    nombreCompleto: 'Admin User',
    accessToken: 'admin-token',
    refreshToken: 'refresh-token',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  }
}

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  return fd
}

function okResponse() {
  return new Response('{}', { status: 200 })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('toggleTabletStatusAction', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'test-app-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sin sesión → { ok: false, error: "No autorizado." }, fetch no llamado', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const result = await toggleTabletStatusAction(
      undefined,
      makeFormData({ codigoTablet: 'TAB001', status: 'inactiva' }),
    )

    expect(result).toEqual({ ok: false, error: 'No autorizado.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rol supervisor → { ok: false, error: "No autorizado." }, fetch no llamado', async () => {
    vi.mocked(getSession).mockResolvedValue({
      ...adminSession(),
      rol: 'supervisor' as const,
    })

    const result = await toggleTabletStatusAction(
      undefined,
      makeFormData({ codigoTablet: 'TAB001', status: 'inactiva' }),
    )

    expect(result).toEqual({ ok: false, error: 'No autorizado.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('codigoTablet vacío → { ok: false, error: "Código de tablet inválido." }', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())

    const result = await toggleTabletStatusAction(
      undefined,
      makeFormData({ codigoTablet: '', status: 'activa' }),
    )

    expect(result).toEqual({ ok: false, error: 'Código de tablet inválido.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('status inválido → { ok: false, error: "Estado inválido." }', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())

    const result = await toggleTabletStatusAction(
      undefined,
      makeFormData({ codigoTablet: 'TAB001', status: 'rota' }),
    )

    expect(result).toEqual({ ok: false, error: 'Estado inválido.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('toggle a "inactiva" → PATCH con { status: "inactiva" } → { ok: true }', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(fetch).mockResolvedValue(okResponse())

    const result = await toggleTabletStatusAction(
      undefined,
      makeFormData({ codigoTablet: 'TAB001', status: 'inactiva' }),
    )

    expect(result).toEqual({ ok: true })
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(init!.body as string)).toEqual({ status: 'inactiva' })
    expect(init!.method).toBe('PATCH')
  })

  it('toggle a "activa" → PATCH con { status: "activa" } → { ok: true }', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(fetch).mockResolvedValue(okResponse())

    const result = await toggleTabletStatusAction(
      undefined,
      makeFormData({ codigoTablet: 'TAB001', status: 'activa' }),
    )

    expect(result).toEqual({ ok: true })
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(init!.body as string)).toEqual({ status: 'activa' })
  })

  it('qb_sync error → devuelve mensaje del servidor', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Tablet no encontrada' }), { status: 404 }),
    )

    const result = await toggleTabletStatusAction(
      undefined,
      makeFormData({ codigoTablet: 'TAB001', status: 'inactiva' }),
    )

    expect(result).toEqual({ ok: false, error: 'Tablet no encontrada' })
  })

  it('error de red → { ok: false, error: "No se pudo conectar con el servidor." }', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(fetch).mockRejectedValue(new Error('Network Error'))

    const result = await toggleTabletStatusAction(
      undefined,
      makeFormData({ codigoTablet: 'TAB001', status: 'activa' }),
    )

    expect(result).toEqual({ ok: false, error: 'No se pudo conectar con el servidor.' })
  })

  it('URL del PATCH incluye el codigoTablet correcto', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(fetch).mockResolvedValue(okResponse())

    await toggleTabletStatusAction(
      undefined,
      makeFormData({ codigoTablet: 'TABLET-ABC', status: 'en_mantenimiento' }),
    )

    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('/qb_sync/tablets/TABLET-ABC/status')
  })
})
