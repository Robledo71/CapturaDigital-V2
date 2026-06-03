// tests/unit/actions/create-client-user.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/back/services/clientService', () => ({
  createClientUser: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { getSession } from '@/back/services/session'
import { createClientUser as serviceCreateClientUser } from '@/back/services/clientService'
import { revalidatePath } from 'next/cache'
import { createClientUser } from '@/app/actions/create-client-user'

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

function supervisorSession() {
  return { ...adminSession(), rol: 'supervisor' as const }
}

function makeFormData(overrides: Record<string, string> = {}): FormData {
  const defaults: Record<string, string> = {
    clienteId: '5',
    nombreCompleto: 'Maria Torres',
    codigoEmpleado: 'CLI001',
    correo: 'maria@honda.com',
    contrasena: 'pass1234',
  }
  const fd = new FormData()
  const merged = { ...defaults, ...overrides }
  for (const [k, v] of Object.entries(merged)) fd.append(k, v)
  return fd
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('createClientUser action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin sesión → { errors: { general: ["No autorizado"] } }', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const result = await createClientUser(undefined, makeFormData())

    expect(result).toEqual({ errors: { general: ['No autorizado'] } })
    expect(serviceCreateClientUser).not.toHaveBeenCalled()
  })

  it('rol "capturacion" → { errors: { general: ["No autorizado"] } }', async () => {
    vi.mocked(getSession).mockResolvedValue({
      ...adminSession(),
      rol: 'capturacion' as const,
    })

    const result = await createClientUser(undefined, makeFormData())

    expect(result).toEqual({ errors: { general: ['No autorizado'] } })
    expect(serviceCreateClientUser).not.toHaveBeenCalled()
  })

  it('clienteId inválido (NaN) → error Zod en clienteId', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())

    const result = await createClientUser(undefined, makeFormData({ clienteId: 'abc' }))

    expect(result).toMatchObject({ errors: { clienteId: expect.any(Array) } })
    expect(serviceCreateClientUser).not.toHaveBeenCalled()
  })

  it('correo con formato inválido → error Zod en correo', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())

    const result = await createClientUser(undefined, makeFormData({ correo: 'no-es-correo' }))

    expect(result).toMatchObject({ errors: { correo: expect.any(Array) } })
    expect(serviceCreateClientUser).not.toHaveBeenCalled()
  })

  it('contrasena < 8 chars → error Zod en contrasena', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())

    const result = await createClientUser(undefined, makeFormData({ contrasena: 'corta' }))

    expect(result).toMatchObject({ errors: { contrasena: expect.any(Array) } })
    expect(serviceCreateClientUser).not.toHaveBeenCalled()
  })

  it('creación exitosa → { success: true } + revalidatePath llamado', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(serviceCreateClientUser).mockResolvedValue({ ok: true })

    const result = await createClientUser(undefined, makeFormData())

    expect(result).toEqual({ success: true })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/clientes')
  })

  it('qb_sync 404 → { errors: { general: ["El cliente no existe"] } }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())
    vi.mocked(serviceCreateClientUser).mockResolvedValue({ ok: false, reason: 'not_found' })

    const result = await createClientUser(undefined, makeFormData())

    expect(result).toEqual({ errors: { general: ['El cliente no existe'] } })
  })

  it('qb_sync 409 con mensaje que contiene "correo" → error en campo correo', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(serviceCreateClientUser).mockResolvedValue({
      ok: false,
      reason: 'duplicate',
      message: 'El correo ya está registrado',
    })

    const result = await createClientUser(undefined, makeFormData())

    expect(result).toMatchObject({ errors: { correo: expect.any(Array) } })
  })

  it('qb_sync 400 validación → { errors: { general: [mensaje] } }', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(serviceCreateClientUser).mockResolvedValue({
      ok: false,
      reason: 'validation',
      message: 'El campo correo es inválido',
    })

    const result = await createClientUser(undefined, makeFormData())

    expect(result).toMatchObject({ errors: { general: expect.any(Array) } })
  })

  it('URL del POST incluye el clienteId correcto en la llamada al servicio', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(serviceCreateClientUser).mockResolvedValue({ ok: true })

    await createClientUser(undefined, makeFormData({ clienteId: '42' }))

    expect(serviceCreateClientUser).toHaveBeenCalledWith(
      expect.objectContaining({ clienteId: 42 }),
      'admin-token',
    )
  })

  it('body enviado incluye todos los campos requeridos', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(serviceCreateClientUser).mockResolvedValue({ ok: true })

    await createClientUser(
      undefined,
      makeFormData({
        clienteId: '7',
        nombreCompleto: 'Carlos Ruiz',
        codigoEmpleado: 'CLI007',
        correo: 'carlos@example.com',
        contrasena: 'supersecret',
      }),
    )

    expect(serviceCreateClientUser).toHaveBeenCalledWith(
      {
        clienteId: 7,
        nombreCompleto: 'Carlos Ruiz',
        codigoEmpleado: 'CLI007',
        correo: 'carlos@example.com',
        contrasena: 'supersecret',
      },
      'admin-token',
    )
  })
})
