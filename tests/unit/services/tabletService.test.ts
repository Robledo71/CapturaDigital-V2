// tests/unit/services/tabletService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getAllTablets, createTablet, updateTablet } from '@/back/services/tabletService'

const ACCESS_TOKEN = 'test-token'

function makeExternalTablet() {
  return {
    id: 1,
    codigoTablet: 'GEN-1234',
    alias: 'Tablet-A',
    model: 'iPad 10',
    serialNumber: 'SN-ABC-001',
    plantId: 2,
    plantName: 'Honda De Mexico',
    status: 'activa',
    lastSeenAt: null,
    currentInspectorName: null,
    notes: 'Notas de prueba',
  }
}

describe('tabletService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'app-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ─── getAllTablets ──────────────────────────────────────────────────────────

  describe('getAllTablets', () => {
    it('fetch exitoso devuelve array de TabletRow', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: [makeExternalTablet()] }),
          { status: 200 },
        ),
      )

      const result = await getAllTablets(ACCESS_TOKEN)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 1,
        codigotablet: 'GEN-1234',
        alias: 'Tablet-A',
        modelo: 'iPad 10',
        serie: 'SN-ABC-001',
        plantaId: 2,
        plantaNombre: 'Honda De Mexico',
        estado: 'activa',
        notes: 'Notas de prueba',
      })
    })

    it('respuesta no-ok lanza error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 }),
      )

      await expect(getAllTablets(ACCESS_TOKEN)).rejects.toThrow('API responded 401')
    })
  })

  // ─── createTablet ──────────────────────────────────────────────────────────

  describe('createTablet', () => {
    const input = {
      modelo: 'iPad 10',
      serie: 'SN-NEW-001',
      codigotablet: 'HONDA-5678',
    }

    it('respuesta exitosa devuelve { ok: true, tablet }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: makeExternalTablet() }),
          { status: 201 },
        ),
      )

      const result = await createTablet(input, ACCESS_TOKEN)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.tablet).toBeDefined()
        expect(result.tablet.codigotablet).toBe('GEN-1234')
      }
    })

    it('código duplicado (409 con "codigo") devuelve { ok: false, reason: "duplicate_codigo" }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: 'codigo_tablet already exists' }),
          { status: 409 },
        ),
      )

      const result = await createTablet(input, ACCESS_TOKEN)
      expect(result).toEqual({ ok: false, reason: 'duplicate_codigo' })
    })

    it('serie duplicada (409 sin "codigo") devuelve { ok: false, reason: "duplicate_serie" }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: 'serial number duplicado' }),
          { status: 409 },
        ),
      )

      const result = await createTablet(input, ACCESS_TOKEN)
      expect(result).toEqual({ ok: false, reason: 'duplicate_serie' })
    })

    it('respuesta 500 lanza error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response('Server Error', { status: 500 }),
      )

      await expect(createTablet(input, ACCESS_TOKEN)).rejects.toThrow('API responded 500')
    })
  })

  // ─── updateTablet ──────────────────────────────────────────────────────────

  describe('updateTablet', () => {
    const input = {
      id: 1,
      modelo: 'iPad 11',
      serie: 'SN-ABC-001',
      codigotablet: 'GEN-1234',
      alias: 'Tablet-B',
      plantaId: 3,
      notes: 'Actualizado',
      estado: 'activa',
    }

    it('respuesta exitosa incluye alias, serial_number, notes, status', async () => {
      const updatedTablet = {
        ...makeExternalTablet(),
        alias: 'Tablet-B',
        serialNumber: 'SN-ABC-001',
        notes: 'Actualizado',
        status: 'activa',
      }
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: updatedTablet }),
          { status: 200 },
        ),
      )

      const result = await updateTablet(input, ACCESS_TOKEN)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.tablet.alias).toBe('Tablet-B')
        expect(result.tablet.serie).toBe('SN-ABC-001')
        expect(result.tablet.notes).toBe('Actualizado')
        expect(result.tablet.estado).toBe('activa')
      }
    })

    it('respuesta 404 → { ok: false, reason: "not_found" }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response('Not Found', { status: 404 }),
      )

      const result = await updateTablet(input, ACCESS_TOKEN)
      expect(result).toEqual({ ok: false, reason: 'not_found' })
    })

    it('codigotablet vacío → { ok: false, reason: "not_found" } sin llamar fetch', async () => {
      const noCodeInput = { ...input, codigotablet: '' }

      const result = await updateTablet(noCodeInput, ACCESS_TOKEN)
      expect(result).toEqual({ ok: false, reason: 'not_found' })
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  // ─── generateCodigoTablet (via createTablet without explicit codigo) ────────

  describe('generateCodigoTablet — prefix derivado del nombre de planta', () => {
    it('"Honda De Mexico" genera código con prefijo "HONDADEMEXIC" (primeras 3 palabras unidas, máx 12 chars, mayúsculas)', async () => {
      // buildPlantPrefix: words.join('').toUpperCase().slice(0, 12)
      // "Honda"+"De"+"Mexico" = "HondaDeMexico" → upper → "HONDADEMEXIC" (12 chars)
      vi.mocked(fetch)
        // First call: list tablets to find plant name
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [{ plantId: 5, plantName: 'Honda De Mexico' }],
            }),
            { status: 200 },
          ),
        )
        // Second call: actual POST
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ data: { ...makeExternalTablet(), codigoTablet: 'HONDADEMEXIC-4321' } }),
            { status: 201 },
          ),
        )

      const result = await createTablet({ modelo: 'iPad', serie: 'SN-001', plantaId: 5 }, ACCESS_TOKEN)

      expect(result.ok).toBe(true)

      // Verify the POST body included a codigo starting with "HONDADEMEXIC-"
      const postCall = vi.mocked(fetch).mock.calls[1]
      const body = JSON.parse(postCall[1]!.body as string) as { codigo_tablet: string }
      expect(body.codigo_tablet).toMatch(/^HONDADEMEXIC-\d{4}$/)
    })

    it('sin planta asignada genera código con prefijo "GEN"', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: makeExternalTablet() }),
          { status: 201 },
        ),
      )

      const result = await createTablet({ modelo: 'iPad', serie: 'SN-002' }, ACCESS_TOKEN)

      expect(result.ok).toBe(true)

      const postCall = vi.mocked(fetch).mock.calls[0]
      const body = JSON.parse(postCall[1]!.body as string) as { codigo_tablet: string }
      expect(body.codigo_tablet).toMatch(/^GEN-\d{4}$/)
    })
  })
})
