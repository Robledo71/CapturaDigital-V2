// tests/unit/actions/toggle-user-status.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

import { getSession } from '@/back/services/session'
import { toggleUserStatusAction } from '@/app/actions/toggle-user-status'

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

describe('toggleUserStatusAction', () => {
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

    const result = await toggleUserStatusAction(
      undefined,
      makeFormData({ codigoEmpleado: 'EMP001', isActive: 'false' }),
    )

    expect(result).toEqual({ ok: false, error: 'No autorizado.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rol supervisor → { ok: false, error: "No autorizado." }, fetch no llamado', async () => {
    vi.mocked(getSession).mockResolvedValue({
      ...adminSession(),
      rol: 'supervisor' as const,
    })

    const result = await toggleUserStatusAction(
      undefined,
      makeFormData({ codigoEmpleado: 'EMP001', isActive: 'false' }),
    )

    expect(result).toEqual({ ok: false, error: 'No autorizado.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('codigoEmpleado vacío → { ok: false, error: "Código de empleado inválido." }', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())

    const result = await toggleUserStatusAction(
      undefined,
      makeFormData({ codigoEmpleado: '', isActive: 'false' }),
    )

    expect(result).toEqual({ ok: false, error: 'Código de empleado inválido.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('desactivar (isActive: false) → PUT con { is_active: false } → { ok: true }', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(fetch).mockResolvedValue(okResponse())

    const result = await toggleUserStatusAction(
      undefined,
      makeFormData({ codigoEmpleado: 'EMP001', isActive: 'false' }),
    )

    expect(result).toEqual({ ok: true })
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(init!.body as string)).toEqual({ is_active: false })
  })

  it('activar (isActive: true) → PUT con { is_active: true } → { ok: true }', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(fetch).mockResolvedValue(okResponse())

    const result = await toggleUserStatusAction(
      undefined,
      makeFormData({ codigoEmpleado: 'EMP001', isActive: 'true' }),
    )

    expect(result).toEqual({ ok: true })
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(init!.body as string)).toEqual({ is_active: true })
  })

  it('qb_sync responde error → { ok: false, error: mensaje }', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Usuario no encontrado' }), { status: 404 }),
    )

    const result = await toggleUserStatusAction(
      undefined,
      makeFormData({ codigoEmpleado: 'EMP001', isActive: 'false' }),
    )

    expect(result).toEqual({ ok: false, error: 'Usuario no encontrado' })
  })

  it('error de red → { ok: false, error: "No se pudo conectar..." }', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(fetch).mockRejectedValue(new Error('Network Error'))

    const result = await toggleUserStatusAction(
      undefined,
      makeFormData({ codigoEmpleado: 'EMP001', isActive: 'false' }),
    )

    expect(result).toEqual({ ok: false, error: 'No se pudo conectar con el servidor.' })
  })

  it('URL del PUT incluye el codigoEmpleado correcto', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(fetch).mockResolvedValue(okResponse())

    await toggleUserStatusAction(
      undefined,
      makeFormData({ codigoEmpleado: 'EMP-XYZ', isActive: 'true' }),
    )

    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('/qb_sync/users/EMP-XYZ')
  })

  it('cabeceras incluyen X-App-Token y Authorization: Bearer', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(fetch).mockResolvedValue(okResponse())

    await toggleUserStatusAction(
      undefined,
      makeFormData({ codigoEmpleado: 'EMP001', isActive: 'true' }),
    )

    const [, init] = vi.mocked(fetch).mock.calls[0]
    const headers = init!.headers as Record<string, string>
    expect(headers['X-App-Token']).toBe('test-app-token')
    expect(headers['Authorization']).toBe('Bearer admin-token')
  })
})
