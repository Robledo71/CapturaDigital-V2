// tests/unit/actions/upload-order-document.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

import { getSession } from '@/back/services/session'
import { uploadOrderDocumentAction } from '@/app/actions/upload-order-document'

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

function adminSession() {
  return { ...supervisorSession(), rol: 'admin' as const, accessToken: 'admin-token' }
}

const SMALL_FILE = { size: 1024, name: 'test.pdf', type: 'application/pdf' } as unknown as File
const LARGE_FILE = { size: 26 * 1024 * 1024, name: 'big.pdf', type: 'application/pdf' } as unknown as File
const ZERO_FILE = { size: 0, name: 'empty.pdf', type: 'application/pdf' } as unknown as File
const NON_PDF_FILE = { size: 1024, name: 'sheet.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } as unknown as File

/**
 * Builds a FormData where string fields are appended normally and File fields
 * are injected via a spy on `get()` so the action receives the exact mock object
 * (FormData.append only accepts string|Blob; a plain object would be coerced to
 * "[object Object]" and lose the `size` property).
 */
function makeFormData(fields: Record<string, string | File>): FormData {
  const stringFields: Record<string, string> = {}
  const fileFields: Record<string, File> = {}

  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === 'string') {
      stringFields[k] = v
    } else {
      fileFields[k] = v
    }
  }

  const fd = new FormData()
  for (const [k, v] of Object.entries(stringFields)) fd.append(k, v)

  if (Object.keys(fileFields).length > 0) {
    vi.spyOn(fd, 'get').mockImplementation((key: string) => {
      if (key in fileFields) return fileFields[key] as unknown as string
      // fall back to real string values already appended
      return stringFields[key] ?? null
    })
  }

  return fd
}

function okResponse() {
  return new Response('{}', { status: 200 })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('uploadOrderDocumentAction', () => {
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

    const result = await uploadOrderDocumentAction(
      undefined,
      makeFormData({ orderItemId: '10', docType: 'hoe', file: SMALL_FILE }),
    )

    expect(result).toEqual({ ok: false, error: 'No autorizado' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rol "capturacion" → { ok: false, error: "No autorizado" }', async () => {
    vi.mocked(getSession).mockResolvedValue({
      ...supervisorSession(),
      rol: 'capturacion' as const,
    })

    const result = await uploadOrderDocumentAction(
      undefined,
      makeFormData({ orderItemId: '10', docType: 'hoe', file: SMALL_FILE }),
    )

    expect(result).toEqual({ ok: false, error: 'No autorizado' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('orderItemId inválido (NaN) → { ok: false, error: "ID de item inválido" }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())

    const result = await uploadOrderDocumentAction(
      undefined,
      makeFormData({ orderItemId: 'abc', docType: 'hoe', file: SMALL_FILE }),
    )

    expect(result).toEqual({ ok: false, error: 'ID de item inválido' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('orderItemId = 0 (item no persistido) → { ok: false, error: "ID de item inválido" }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())

    const result = await uploadOrderDocumentAction(
      undefined,
      makeFormData({ orderItemId: '0', docType: 'hoe', file: SMALL_FILE }),
    )

    expect(result).toEqual({ ok: false, error: 'ID de item inválido' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('docType inválido → { ok: false, error: "Tipo de documento inválido" }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())

    const result = await uploadOrderDocumentAction(
      undefined,
      makeFormData({ orderItemId: '10', docType: 'contrato', file: SMALL_FILE }),
    )

    expect(result).toEqual({ ok: false, error: 'Tipo de documento inválido' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sin archivo (size 0) → { ok: false, error: "No se seleccionó ningún archivo" }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())

    const result = await uploadOrderDocumentAction(
      undefined,
      makeFormData({ orderItemId: '10', docType: 'hoe', file: ZERO_FILE }),
    )

    expect(result).toEqual({ ok: false, error: 'No se seleccionó ningún archivo' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('archivo > 25MB → { ok: false, error: "El archivo excede el límite de 25 MB" }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())

    const result = await uploadOrderDocumentAction(
      undefined,
      makeFormData({ orderItemId: '10', docType: 'hoe', file: LARGE_FILE }),
    )

    expect(result).toEqual({ ok: false, error: 'El archivo excede el límite de 25 MB' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('archivo no-PDF → { ok: false, error: "Solo se permiten archivos PDF" }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())

    const result = await uploadOrderDocumentAction(
      undefined,
      makeFormData({ orderItemId: '10', docType: 'hoe', file: NON_PDF_FILE }),
    )

    expect(result).toEqual({ ok: false, error: 'Solo se permiten archivos PDF' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('docType "hoe" → POST a URL con /order-items/:id/documents/hoe → { ok: true, docType: "hoe", orderItemId: 10 }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(fetch).mockResolvedValue(okResponse())

    const result = await uploadOrderDocumentAction(
      undefined,
      makeFormData({ orderItemId: '10', docType: 'hoe', file: SMALL_FILE }),
    )

    expect(result).toEqual({ ok: true, docType: 'hoe', orderItemId: 10 })
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('/qb_sync/order-items/10/documents/hoe')
  })

  it('docType "arranque-seguro" → POST a URL con /order-items/:id/documents/arranque-seguro → { ok: true, docType: "arranque-seguro", orderItemId: 55 }', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(fetch).mockResolvedValue(okResponse())

    const result = await uploadOrderDocumentAction(
      undefined,
      makeFormData({ orderItemId: '55', docType: 'arranque-seguro', file: SMALL_FILE }),
    )

    expect(result).toEqual({ ok: true, docType: 'arranque-seguro', orderItemId: 55 })
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('/qb_sync/order-items/55/documents/arranque-seguro')
  })

  it('URL no contiene /orders/ (ruta de-nivel-orden) — usa solo /order-items/', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(fetch).mockResolvedValue(okResponse())

    await uploadOrderDocumentAction(
      undefined,
      makeFormData({ orderItemId: '42', docType: 'hoe', file: SMALL_FILE }),
    )

    const [url] = vi.mocked(fetch).mock.calls[0]
    // Must NOT be the old order-level route
    expect(String(url)).not.toContain('/qb_sync/orders/')
    expect(String(url)).toContain('/qb_sync/order-items/42/documents/hoe')
  })

  it('qb_sync error → { ok: false, error: mensaje del servidor }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Item no encontrado' }), { status: 404 }),
    )

    const result = await uploadOrderDocumentAction(
      undefined,
      makeFormData({ orderItemId: '10', docType: 'hoe', file: SMALL_FILE }),
    )

    expect(result).toEqual({ ok: false, error: 'Item no encontrado' })
  })
})
