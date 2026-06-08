// tests/unit/services/userService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getAllUsuarios, createUsuario, updateUsuario } from '@/back/services/userService'

const ACCESS_TOKEN = 'test-access-token'

function makeExternalUser() {
  return {
    id: 1,
    nombre_completo: 'Ana Garcia',
    codigo_empleado: 'EMP100',
    puesto: 'Inspector',
    planta_id: 2,
    planta_nombre: 'Planta Norte',
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
        codigoEmpleado: 'EMP100',
        puesto: 'Inspector',
        plantaId: 2,
        plantaNombre: 'Planta Norte',
        rol: 'supervisor',
        correo: 'ana@example.com',
        isActive: true,
      })
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
      puesto: 'Supervisor',
      plantaId: 1 as number | null,
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

  // ─── updateUsuario ─────────────────────────────────────────────────────────

  describe('updateUsuario', () => {
    const input = {
      id: 1,
      nombreCompleto: 'Ana Garcia',
      codigoEmpleado: 'EMP100',
      puesto: 'Inspector Senior',
      plantaId: 2 as number | null,
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

    it('envía "correo" en el body del PUT', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ data: makeExternalUser() }), { status: 200 }),
      )

      await updateUsuario({ ...input, correo: 'nuevo@example.com' }, ACCESS_TOKEN)

      const putCall = vi.mocked(fetch).mock.calls[0]
      const body = JSON.parse(putCall[1]!.body as string) as Record<string, unknown>
      expect(body.correo).toBe('nuevo@example.com')
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
