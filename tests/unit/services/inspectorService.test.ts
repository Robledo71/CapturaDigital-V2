// tests/unit/services/inspectorService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getInspectores,
  createInspector,
  updateInspectorName,
  resetInspectorPassword,
} from '@/back/services/inspectorService'

const ACCESS_TOKEN = 'test-access-token'

function makeExternalInspector() {
  return {
    empleado_id: 1,
    codigo_usuario: 'INS-001',
    nombre_empleado: 'Juan',
    apellido_paterno: 'Perez',
    apellido_materno: 'Lopez',
    nombre_completo: 'Juan Perez Lopez',
    plantas: [{ id: 2, nombre: 'Planta Norte' }],
    activo: true,
  }
}

describe('inspectorService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'app-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ─── getInspectores ─────────────────────────────────────────────────────────

  describe('getInspectores', () => {
    it('fetch exitoso mapea inspectors + count/limit', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: { inspectors: [makeExternalInspector()], count: 12, limit: 50 },
          }),
          { status: 200 },
        ),
      )

      const result = await getInspectores(ACCESS_TOKEN)

      expect(result.count).toBe(12)
      expect(result.limit).toBe(50)
      expect(result.inspectors).toHaveLength(1)
      expect(result.inspectors[0]).toMatchObject({
        empleadoId: 1,
        codigoUsuario: 'INS-001',
        nombreEmpleado: 'Juan',
        apellidoPaterno: 'Perez',
        apellidoMaterno: 'Lopez',
        nombreCompleto: 'Juan Perez Lopez',
        plantas: [{ id: 2, nombre: 'Planta Norte' }],
        activo: true,
      })
    })

    it('apellido_materno "X" (default de BD) se mapea a cadena vacía', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              inspectors: [{ ...makeExternalInspector(), apellido_materno: 'X' }],
              count: 1,
              limit: 50,
            },
          }),
          { status: 200 },
        ),
      )

      const result = await getInspectores(ACCESS_TOKEN)
      expect(result.inspectors[0].apellidoMaterno).toBe('')
    })

    it('sin campo "plantas" en la respuesta → mapea a arreglo vacío', async () => {
      const { plantas: _omit, ...sinPlantas } = makeExternalInspector()
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, data: { inspectors: [sinPlantas], count: 1, limit: 50 } }),
          { status: 200 },
        ),
      )

      const result = await getInspectores(ACCESS_TOKEN)
      expect(result.inspectors[0].plantas).toEqual([])
    })

    it('respuesta no-ok lanza error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))

      await expect(getInspectores(ACCESS_TOKEN)).rejects.toThrow('API responded 401')
    })
  })

  // ─── createInspector ────────────────────────────────────────────────────────

  describe('createInspector', () => {
    const input = {
      codigoEmpleado: 'INS-001',
      nombreEmpleado: 'Juan',
      apellidoPaterno: 'Perez',
      plantaIds: [2],
    }

    it('fetch 201 devuelve { ok: true, inspector, generatedPassword }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: { inspector: makeExternalInspector(), generated_password: 'Ab12Cd34' },
          }),
          { status: 201 },
        ),
      )

      const result = await createInspector(input, ACCESS_TOKEN)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.inspector.nombreCompleto).toBe('Juan Perez Lopez')
        expect(result.generatedPassword).toBe('Ab12Cd34')
      }
    })

    it('envía "planta_ids" en el body del POST', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, data: { inspector: makeExternalInspector(), generated_password: 'x' } }),
          { status: 201 },
        ),
      )

      await createInspector(input, ACCESS_TOKEN)

      const postCall = vi.mocked(fetch).mock.calls[0]
      const body = JSON.parse(postCall[1]!.body as string) as Record<string, unknown>
      expect(body.planta_ids).toEqual([2])
      expect(body.codigo_empleado).toBe('INS-001')
    })

    it('fetch 409 devuelve { ok: false, reason: "duplicate_codigo" }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false, message: 'Ya existe' }), { status: 409 }),
      )

      const result = await createInspector(input, ACCESS_TOKEN)
      expect(result).toMatchObject({ ok: false, reason: 'duplicate_codigo' })
    })

    it('fetch 422 con reason "inspector_limit" devuelve { ok: false, reason: "limit" } con el mensaje del backend', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: false, reason: 'inspector_limit', message: 'Límite de 50 alcanzado' }),
          { status: 422 },
        ),
      )

      const result = await createInspector(input, ACCESS_TOKEN)
      expect(result).toMatchObject({ ok: false, reason: 'limit', error: 'Límite de 50 alcanzado' })
    })

    it('fetch con otro error (500) lanza error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 }))

      await expect(createInspector(input, ACCESS_TOKEN)).rejects.toThrow('API responded 500')
    })
  })

  // ─── updateInspectorName ────────────────────────────────────────────────────

  describe('updateInspectorName', () => {
    const fields = { nombreEmpleado: 'Juan', apellidoPaterno: 'Perez', apellidoMaterno: 'Lopez' }

    it('fetch exitoso devuelve { ok: true, inspector }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { inspector: makeExternalInspector() } }), {
          status: 200,
        }),
      )

      const result = await updateInspectorName(1, fields, ACCESS_TOKEN)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.inspector.nombreCompleto).toBe('Juan Perez Lopez')
      }
    })

    it('fetch 404 devuelve { ok: false, reason: "not_found" }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('Not Found', { status: 404 }))

      const result = await updateInspectorName(999, fields, ACCESS_TOKEN)
      expect(result).toMatchObject({ ok: false, reason: 'not_found' })
    })

    it('fetch 403 devuelve { ok: false, reason: "forbidden" }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('Forbidden', { status: 403 }))

      const result = await updateInspectorName(1, fields, ACCESS_TOKEN)
      expect(result).toMatchObject({ ok: false, reason: 'forbidden' })
    })
  })

  // ─── resetInspectorPassword ─────────────────────────────────────────────────

  describe('resetInspectorPassword', () => {
    it('fetch exitoso devuelve { ok: true, generatedPassword }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { generated_password: 'NewPass123' } }), {
          status: 200,
        }),
      )

      const result = await resetInspectorPassword(1, ACCESS_TOKEN)
      expect(result).toEqual({ ok: true, generatedPassword: 'NewPass123' })
    })

    it('fetch 404 devuelve { ok: false, error }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('Not Found', { status: 404 }))

      const result = await resetInspectorPassword(999, ACCESS_TOKEN)
      expect(result.ok).toBe(false)
    })

    it('fetch 403 devuelve { ok: false, error }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('Forbidden', { status: 403 }))

      const result = await resetInspectorPassword(1, ACCESS_TOKEN)
      expect(result.ok).toBe(false)
    })
  })
})
