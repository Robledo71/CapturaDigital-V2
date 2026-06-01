
// tests/unit/actions/update-inspection-item.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

import { getSession } from '@/back/services/session'
import { updateInspectionItemAction } from '@/app/actions/update-inspection-item'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSession() {
  return {
    userId: 1,
    rol: 'capturacion' as const,
    codigoEmpleado: 'CAP001',
    nombreCompleto: 'Carlos Cap',
    accessToken: 'access-token',
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

describe('updateInspectionItemAction', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'app-token'
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sin sesión → { ok: false, error: "No autorizado" }', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const fd = makeFormData({ reportId: '1', itemId: '1' })

    const result = await updateInspectionItemAction(undefined, fd)
    expect(result).toEqual({ ok: false, error: 'No autorizado' })
  })

  it('reportId no numérico → { ok: false, error: "Datos inválidos" }', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    const fd = makeFormData({ reportId: 'abc', itemId: '1', ok: '50', ng: '5', total: '55' })

    const result = await updateInspectionItemAction(undefined, fd)
    expect(result).toEqual({ ok: false, error: 'Datos inválidos' })
  })

  it('itemId no numérico → { ok: false, error: "Datos inválidos" }', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    const fd = makeFormData({ reportId: '1', itemId: 'xyz', ok: '50', ng: '5', total: '55' })

    const result = await updateInspectionItemAction(undefined, fd)
    expect(result).toEqual({ ok: false, error: 'Datos inválidos' })
  })

  it('suma de piezas válida (ok + ng = total) → éxito', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    )

    const fd = makeFormData({
      reportId: '10',
      itemId: '5',
      ok: '90',
      ng: '10',
      recovered: '3',
      total: '100',
      incidents: '[]',
    })

    const result = await updateInspectionItemAction(undefined, fd)
    expect(result).toEqual({ ok: true })

    // Verify correct values sent to API
    const fetchCall = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse(fetchCall[1]!.body as string) as {
      ok_pieces: number
      ng_pieces: number
      total_pieces: number
      recovered_pieces: number
      scrap_pieces: number
    }
    expect(body.ok_pieces).toBe(90)
    expect(body.ng_pieces).toBe(10)
    expect(body.total_pieces).toBe(100)
    expect(body.recovered_pieces).toBe(3)
    expect(body.scrap_pieces).toBe(7) // ng - recovered
  })

  it('qb_sync devuelve error → { ok: false, error: mensaje }', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ message: 'Item no encontrado' }),
        { status: 404 },
      ),
    )

    const fd = makeFormData({
      reportId: '10',
      itemId: '99',
      ok: '50',
      ng: '5',
      total: '55',
    })

    const result = await updateInspectionItemAction(undefined, fd)
    expect(result).toEqual({ ok: false, error: 'Item no encontrado' })
  })

  it('qb_sync error sin mensaje → mensaje genérico', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('{}', { status: 500 }),
    )

    const fd = makeFormData({ reportId: '1', itemId: '1', ok: '0', ng: '0', total: '0' })

    const result = await updateInspectionItemAction(undefined, fd)
    expect(result).toMatchObject({ ok: false, error: expect.any(String) })
  })

  it('recovered se clampea a ng (no puede superar ng)', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    )

    const fd = makeFormData({
      reportId: '1',
      itemId: '1',
      ok: '80',
      ng: '5',
      recovered: '10', // más que ng
      total: '85',
    })

    await updateInspectionItemAction(undefined, fd)

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string) as {
      recovered_pieces: number
      scrap_pieces: number
    }
    expect(body.recovered_pieces).toBe(5) // clamped to ng
    expect(body.scrap_pieces).toBe(0)
  })
})
