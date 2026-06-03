// tests/unit/actions/release-order-item.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

import { getSession } from '@/back/services/session'
import { releaseOrderItemAction } from '@/app/actions/release-order-item'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function supervisorSession() {
  return {
    userId: 2,
    rol: 'supervisor' as const,
    codigoEmpleado: 'SUP001',
    nombreCompleto: 'Supervisor User',
    accessToken: 'sup-token',
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

describe('releaseOrderItemAction', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'test-app-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sin sesión → { ok: false, error: "No autorizado" }', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const result = await releaseOrderItemAction(
      undefined,
      makeFormData({ orderItemId: '7' }),
    )

    expect(result).toEqual({ ok: false, error: 'No autorizado' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('orderItemId inválido (0 / NaN) → { ok: false, error: "Item requerido" }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())

    const result = await releaseOrderItemAction(
      undefined,
      makeFormData({ orderItemId: 'abc' }),
    )

    expect(result).toEqual({ ok: false, error: 'Item requerido' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('liberación exitosa → DELETE a /qb_sync/order-items/:id/session → { ok: true }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(fetch).mockResolvedValue(okResponse())

    const result = await releaseOrderItemAction(
      undefined,
      makeFormData({ orderItemId: '7' }),
    )

    expect(result).toEqual({ ok: true })
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(init!.method).toBe('DELETE')
  })

  it('qb_sync 404 → { ok: false, error: mensaje }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Item no encontrado' }), { status: 404 }),
    )

    const result = await releaseOrderItemAction(
      undefined,
      makeFormData({ orderItemId: '7' }),
    )

    expect(result).toEqual({ ok: false, error: 'Item no encontrado' })
  })

  it('error de red → { ok: false, error: "No se pudo conectar con el servidor." }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(fetch).mockRejectedValue(new Error('Network Error'))

    const result = await releaseOrderItemAction(
      undefined,
      makeFormData({ orderItemId: '7' }),
    )

    expect(result).toEqual({ ok: false, error: 'No se pudo conectar con el servidor.' })
  })

  it('URL incluye el orderItemId correcto', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(fetch).mockResolvedValue(okResponse())

    await releaseOrderItemAction(undefined, makeFormData({ orderItemId: '42' }))

    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('/qb_sync/order-items/42/session')
  })
})
