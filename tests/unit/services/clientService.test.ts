// tests/unit/services/clientService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getAllClientes,
  createCliente,
  deleteCliente,
  createClientUser,
} from '@/back/services/clientService'

const ACCESS_TOKEN = 'test-token'

function makeRawCliente() {
  return {
    id: 1,
    name: 'Honda',
    user_id: null,
    nombre_completo: null,
    correo: null,
  }
}

describe('clientService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'app-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ─── getAllClientes ─────────────────────────────────────────────────────────

  describe('getAllClientes', () => {
    it('fetch exitoso devuelve array de ClienteRow', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, data: [makeRawCliente()] }),
          { status: 200 },
        ),
      )

      const result = await getAllClientes(ACCESS_TOKEN)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 1,
        nombre: 'Honda',
        userId: null,
        userNombre: null,
        userCorreo: null,
      })
    })

    it('respuesta no-ok lanza error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 }),
      )

      await expect(getAllClientes(ACCESS_TOKEN)).rejects.toThrow('getAllClientes failed: 401')
    })
  })

  // ─── createCliente ─────────────────────────────────────────────────────────

  describe('createCliente', () => {
    it('fetch 409 devuelve { ok: false, reason: "duplicate_name" }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response('Conflict', { status: 409 }),
      )

      const result = await createCliente({ nombre: 'Honda' }, ACCESS_TOKEN)
      expect(result).toEqual({ ok: false, reason: 'duplicate_name' })
    })

    it('fetch exitoso devuelve { ok: true, cliente }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, data: makeRawCliente() }),
          { status: 201 },
        ),
      )

      const result = await createCliente({ nombre: 'Honda' }, ACCESS_TOKEN)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.cliente.nombre).toBe('Honda')
      }
    })

    it('otro error devuelve { ok: false, reason: "error" }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response('Server Error', { status: 500 }),
      )

      const result = await createCliente({ nombre: 'Honda' }, ACCESS_TOKEN)
      expect(result).toEqual({ ok: false, reason: 'error' })
    })
  })

  // ─── deleteCliente ─────────────────────────────────────────────────────────

  describe('deleteCliente', () => {
    it('fetch 404 devuelve { ok: false, reason: "not_found" }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response('Not Found', { status: 404 }),
      )

      const result = await deleteCliente(99, ACCESS_TOKEN)
      expect(result).toEqual({ ok: false, reason: 'not_found' })
    })

    it('fetch exitoso devuelve { ok: true }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response('{}', { status: 200 }),
      )

      const result = await deleteCliente(1, ACCESS_TOKEN)
      expect(result).toEqual({ ok: true })
    })

    it('otro error devuelve { ok: false, reason: "error" }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response('Server Error', { status: 500 }),
      )

      const result = await deleteCliente(1, ACCESS_TOKEN)
      expect(result).toEqual({ ok: false, reason: 'error' })
    })
  })

  // ─── createClientUser ──────────────────────────────────────────────────────

  describe('createClientUser', () => {
    const input = {
      clienteId: 1,
      nombreCompleto: 'Maria Torres',
      codigoEmpleado: 'CLI001',
      correo: 'maria@honda.com',
      contrasena: 'pass1234',
    }

    it('fetch exitoso devuelve { ok: true }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response('', { status: 201 }),
      )

      const result = await createClientUser(input, ACCESS_TOKEN)
      expect(result).toEqual({ ok: true })
    })

    it('fetch 409 con mensaje "correo" devuelve { ok: false, reason: "duplicate", message }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: 'El correo ya está registrado' }),
          { status: 409 },
        ),
      )

      const result = await createClientUser(input, ACCESS_TOKEN)
      expect(result).toEqual({
        ok: false,
        reason: 'duplicate',
        message: 'El correo ya está registrado',
      })
    })

    it('fetch 404 devuelve { ok: false, reason: "not_found" }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response('Not Found', { status: 404 }),
      )

      const result = await createClientUser(input, ACCESS_TOKEN)
      expect(result).toEqual({ ok: false, reason: 'not_found' })
    })

    it('fetch 400 devuelve { ok: false, reason: "validation" }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: 'correo inválido' }),
          { status: 400 },
        ),
      )

      const result = await createClientUser(input, ACCESS_TOKEN)
      expect(result).toMatchObject({ ok: false, reason: 'validation' })
    })
  })
})
