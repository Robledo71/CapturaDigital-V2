// tests/unit/services/userService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getAllUsuarios,
  createUsuario,
  updateUsuario,
  getNextCodigoEmpleado,
} from '@/back/services/userService'

const ACCESS_TOKEN = 'test-access-token'

function makeExternalUser() {
  return {
    id: 1,
    nombre_completo: 'Ana Garcia',
    nombre_empleado: 'Ana',
    apellido_paterno: 'Garcia',
    apellido_materno: 'Lopez',
    codigo_empleado: 'EMP100',
    planta_id: 2,
    planta_nombre: 'Planta Norte',
    plantas: [
      { id: 2, nombre: 'Planta Norte' },
      { id: 4, nombre: 'Planta Sur' },
    ],
    rol: 'supervisor',
    correo: 'ana@example.com',
    is_active: true,
  }
}

describe('userService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'app-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ─── getAllUsuarios ─────────────────────────────────────────────────────────

  describe('getAllUsuarios', () => {
    it('fetch exitoso devuelve array de UsuarioRow', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: [makeExternalUser()] }),
          { status: 200 },
        ),
      )

      const result = await getAllUsuarios(ACCESS_TOKEN)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 1,
        nombreCompleto: 'Ana Garcia',
        nombreEmpleado: 'Ana',
        apellidoPaterno: 'Garcia',
        apellidoMaterno: 'Lopez',
        codigoEmpleado: 'EMP100',
        plantaId: 2,
        plantaNombre: 'Planta Norte',
        plantas: [
          { id: 2, nombre: 'Planta Norte' },
          { id: 4, nombre: 'Planta Sur' },
        ],
        rol: 'supervisor',
        correo: 'ana@example.com',
        isActive: true,
      })
    })

    it('sin campo "plantas" en la respuesta → mapea a arreglo vacío', async () => {
      const { plantas: _omit, ...userSinPlantas } = makeExternalUser()
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [userSinPlantas] }), { status: 200 }),
      )

      const result = await getAllUsuarios(ACCESS_TOKEN)
      expect(result[0].plantas).toEqual([])
    })

    it('apellido_materno "X" (default de BD) se mapea a cadena vacía', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: [{ ...makeExternalUser(), apellido_materno: 'X' }] }),
          { status: 200 },
        ),
      )

      const result = await getAllUsuarios(ACCESS_TOKEN)
      expect(result[0].apellidoMaterno).toBe('')
    })

    it('respuesta vacía devuelve array vacío', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), { status: 200 }),
      )

      const result = await getAllUsuarios(ACCESS_TOKEN)
      expect(result).toEqual([])
    })

    it('respuesta no-ok lanza error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 }),
      )

      await expect(getAllUsuarios(ACCESS_TOKEN)).rejects.toThrow('API responded 401')
    })
  })

  // ─── createUsuario ─────────────────────────────────────────────────────────

  describe('createUsuario', () => {
    const input = {
      nombreCompleto: 'Pedro Ramirez',
      codigoEmpleado: 'EMP200',
      plantaIds: [1] as number[],
      rol: 'supervisor' as const,
      correo: 'pedro@example.com',
      contrasena: 'secret123',
    }

    it('fetch exitoso devuelve { ok: true, usuario }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: makeExternalUser() }),
          { status: 201 },
        ),
      )

      const result = await createUsuario(input, ACCESS_TOKEN)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.usuario).toBeDefined()
        expect(result.usuario.nombreCompleto).toBe('Ana Garcia')
      }
    })

    it('envía "planta_ids" (arreglo) en el body del POST', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ data: makeExternalUser() }), { status: 201 }),
      )

      await createUsuario(input, ACCESS_TOKEN)

      const postCall = vi.mocked(fetch).mock.calls[0]
      const body = JSON.parse(postCall[1]!.body as string) as Record<string, unknown>
      expect(body.planta_ids).toEqual([1])
    })

    it('plantaIds vacío → envía "planta_ids": []', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ data: makeExternalUser() }), { status: 201 }),
      )

      await createUsuario({ ...input, plantaIds: [] }, ACCESS_TOKEN)

      const postCall = vi.mocked(fetch).mock.calls[0]
      const body = JSON.parse(postCall[1]!.body as string) as Record<string, unknown>
      expect(body.planta_ids).toEqual([])
    })

    it('fetch 409 con mensaje "codigo" devuelve { ok: false, reason: "duplicate_codigo" }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: 'El codigo ya existe' }),
          { status: 409 },
        ),
      )

      const result = await createUsuario(input, ACCESS_TOKEN)
      expect(result).toEqual({ ok: false, reason: 'duplicate_codigo' })
    })

    it('fetch 409 con mensaje "correo" devuelve { ok: false, reason: "duplicate_correo" }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: 'El correo ya está registrado' }),
          { status: 409 },
        ),
      )

      const result = await createUsuario(input, ACCESS_TOKEN)
      expect(result).toEqual({ ok: false, reason: 'duplicate_correo' })
    })

    it('fetch 409 sin mensaje específico devuelve { ok: false, reason: "duplicate_codigo" }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: 'Duplicate entry' }),
          { status: 409 },
        ),
      )

      const result = await createUsuario(input, ACCESS_TOKEN)
      expect(result).toEqual({ ok: false, reason: 'duplicate_codigo' })
    })

    it('fetch con otro error (500) lanza error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response('Internal Server Error', { status: 500 }),
      )

      await expect(createUsuario(input, ACCESS_TOKEN)).rejects.toThrow('API responded 500')
    })
  })

  // ─── getNextCodigoEmpleado ──────────────────────────────────────────────────

  describe('getNextCodigoEmpleado', () => {
    it('con rol → agrega "?rol=" a la URL y devuelve el código role-prefijado', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { codigo: 'SUP-01' } }), { status: 200 }),
      )

      const result = await getNextCodigoEmpleado(ACCESS_TOKEN, 'supervisor')

      expect(result).toBe('SUP-01')
      const [url] = vi.mocked(fetch).mock.calls[0]
      expect(url).toBe('http://localhost:3001/qb_sync/users/next-codigo?rol=supervisor')
    })

    it('sin rol → no agrega query string', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { codigo: null } }), { status: 200 }),
      )

      await getNextCodigoEmpleado(ACCESS_TOKEN)

      const [url] = vi.mocked(fetch).mock.calls[0]
      expect(url).toBe('http://localhost:3001/qb_sync/users/next-codigo')
    })

    it('codifica el rol en la URL', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { codigo: 'SRE-01' } }), { status: 200 }),
      )

      await getNextCodigoEmpleado(ACCESS_TOKEN, 'supervisor_regional')

      const [url] = vi.mocked(fetch).mock.calls[0]
      expect(url).toBe('http://localhost:3001/qb_sync/users/next-codigo?rol=supervisor_regional')
    })

    it('respuesta no-ok (400 sin rol válido) devuelve null', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('Bad Request', { status: 400 }))

      const result = await getNextCodigoEmpleado(ACCESS_TOKEN)
      expect(result).toBeNull()
    })
  })

  // ─── updateUsuario ─────────────────────────────────────────────────────────

  describe('updateUsuario', () => {
    const input = {
      id: 1,
      nombreEmpleado: 'Ana',
      apellidoPaterno: 'Garcia',
      apellidoMaterno: 'Lopez',
      codigoEmpleado: 'EMP100',
      plantaIds: [2, 4] as number[],
      rol: 'supervisor' as const,
      correo: 'ana@example.com',
    }

    it('fetch exitoso devuelve { ok: true, usuario }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: makeExternalUser() }),
          { status: 200 },
        ),
      )

      const result = await updateUsuario(input, ACCESS_TOKEN)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.usuario).toBeDefined()
      }
    })

    it('envía "planta_ids" (arreglo) en el body del PUT', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ data: makeExternalUser() }), { status: 200 }),
      )

      await updateUsuario(input, ACCESS_TOKEN)

      const putCall = vi.mocked(fetch).mock.calls[0]
      const body = JSON.parse(putCall[1]!.body as string) as Record<string, unknown>
      expect(body.planta_ids).toEqual([2, 4])
    })

    it('envía "correo" en el body del PUT', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ data: makeExternalUser() }), { status: 200 }),
      )

      await updateUsuario({ ...input, correo: 'nuevo@example.com' }, ACCESS_TOKEN)

      const putCall = vi.mocked(fetch).mock.calls[0]
      const body = JSON.parse(putCall[1]!.body as string) as Record<string, unknown>
      expect(body.correo).toBe('nuevo@example.com')
    })

    it('envía nombre_empleado, apellido_paterno y apellido_materno en el body del PUT (no nombre_completo)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ data: makeExternalUser() }), { status: 200 }),
      )

      await updateUsuario(input, ACCESS_TOKEN)

      const putCall = vi.mocked(fetch).mock.calls[0]
      const body = JSON.parse(putCall[1]!.body as string) as Record<string, unknown>
      expect(body.nombre_empleado).toBe('Ana')
      expect(body.apellido_paterno).toBe('Garcia')
      expect(body.apellido_materno).toBe('Lopez')
      expect(body.nombre_completo).toBeUndefined()
    })

    it('apellidoMaterno omitido → envía apellido_materno vacío', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ data: makeExternalUser() }), { status: 200 }),
      )

      const { apellidoMaterno: _omit, ...withoutApellidoMaterno } = input
      await updateUsuario(withoutApellidoMaterno, ACCESS_TOKEN)

      const putCall = vi.mocked(fetch).mock.calls[0]
      const body = JSON.parse(putCall[1]!.body as string) as Record<string, unknown>
      expect(body.apellido_materno).toBe('')
    })

    it('fetch 404 devuelve { ok: false, reason: "not_found" }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response('Not Found', { status: 404 }),
      )

      const result = await updateUsuario(input, ACCESS_TOKEN)
      expect(result).toEqual({ ok: false, reason: 'not_found' })
    })

    it('fetch 409 con "correo" devuelve { ok: false, reason: "duplicate_correo" }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: 'correo duplicado' }),
          { status: 409 },
        ),
      )

      const result = await updateUsuario(input, ACCESS_TOKEN)
      expect(result).toEqual({ ok: false, reason: 'duplicate_correo' })
    })
  })
})
