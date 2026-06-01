// tests/unit/actions/create-user.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/back/services/userService', () => ({
  createUsuario: vi.fn(),
}))

import { getSession } from '@/back/services/session'
import { createUsuario } from '@/back/services/userService'
import { createUser } from '@/app/actions/create-user'

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function supervisorSession() {
  return { ...adminSession(), rol: 'supervisor' as const }
}

function validFormData(overrides: Record<string, string> = {}): FormData {
  const defaults: Record<string, string> = {
    nombreCompleto: 'Pedro Ramirez',
    codigoEmpleado: 'EMP200',
    puesto: 'Inspector',
    plantaId: '1',
    rol: 'supervisor',
    correo: 'pedro@example.com',
    contrasena: 'secret1234',
    confirmContrasena: 'secret1234',
  }
  const fd = new FormData()
  const merged = { ...defaults, ...overrides }
  for (const [key, value] of Object.entries(merged)) {
    fd.append(key, value)
  }
  return fd
}

function makeUsuarioRow() {
  return {
    id: 1,
    nombreCompleto: 'Pedro Ramirez',
    codigoEmpleado: 'EMP200',
    puesto: 'Inspector',
    plantaId: 1,
    plantaNombre: 'Planta Norte',
    rol: 'supervisor' as const,
    correo: 'pedro@example.com',
    isActive: true,
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('createUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin sesión → { errors: { general: ["No autorizado"] } }', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const result = await createUser(undefined, validFormData())
    expect(result).toEqual({ errors: { general: ['No autorizado'] } })
    expect(createUsuario).not.toHaveBeenCalled()
  })

  it('rol distinto a "admin" → error de autorización', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())

    const result = await createUser(undefined, validFormData())
    expect(result).toMatchObject({ errors: { general: expect.arrayContaining(['No autorizado']) } })
    expect(createUsuario).not.toHaveBeenCalled()
  })

  it('campo codigoEmpleado vacío → error de validación Zod', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())

    const result = await createUser(undefined, validFormData({ codigoEmpleado: '' }))
    expect(result).toMatchObject({ errors: { codigoEmpleado: expect.any(Array) } })
    expect(createUsuario).not.toHaveBeenCalled()
  })

  it('correo con formato inválido → error de validación', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())

    const result = await createUser(undefined, validFormData({ correo: 'no-es-un-correo' }))
    expect(result).toMatchObject({ errors: { correo: expect.any(Array) } })
    expect(createUsuario).not.toHaveBeenCalled()
  })

  it('contraseñas no coinciden → error en confirmContrasena', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())

    const result = await createUser(
      undefined,
      validFormData({ contrasena: 'secret1234', confirmContrasena: 'different' }),
    )
    expect(result).toMatchObject({ errors: { confirmContrasena: expect.any(Array) } })
    expect(createUsuario).not.toHaveBeenCalled()
  })

  it('contraseña menor a 8 caracteres → error de validación', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())

    const result = await createUser(
      undefined,
      validFormData({ contrasena: 'short', confirmContrasena: 'short' }),
    )
    expect(result).toMatchObject({ errors: { contrasena: expect.any(Array) } })
  })

  it('plantaId inválido → error de validación', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())

    const result = await createUser(undefined, validFormData({ plantaId: '' }))
    expect(result).toMatchObject({ errors: { plantaId: expect.any(Array) } })
  })

  it('creación exitosa → { success: true, usuario }', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(createUsuario).mockResolvedValue({ ok: true, usuario: makeUsuarioRow() })

    const result = await createUser(undefined, validFormData())

    expect(result).toMatchObject({ success: true })
    expect(result?.usuario).toBeDefined()
    expect(createUsuario).toHaveBeenCalledOnce()
  })

  it('duplicado de código → error en codigoEmpleado', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(createUsuario).mockResolvedValue({ ok: false, reason: 'duplicate_codigo' })

    const result = await createUser(undefined, validFormData())
    expect(result).toMatchObject({
      errors: { codigoEmpleado: expect.arrayContaining([expect.stringContaining('código')]) },
    })
  })

  it('duplicado de correo → error en correo', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(createUsuario).mockResolvedValue({ ok: false, reason: 'duplicate_correo' })

    const result = await createUser(undefined, validFormData())
    expect(result).toMatchObject({
      errors: { correo: expect.arrayContaining([expect.stringContaining('correo')]) },
    })
  })

  it('error inesperado en createUsuario → error general', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(createUsuario).mockRejectedValue(new Error('DB down'))

    const result = await createUser(undefined, validFormData())
    expect(result).toMatchObject({ errors: { general: expect.any(Array) } })
  })
})
