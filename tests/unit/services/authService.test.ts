// tests/unit/services/authService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock userRepository before importing the service
vi.mock('@/back/repositories/userRepository', () => ({
  findByCodigoEmpleado: vi.fn(),
  incrementFailedAttempts: vi.fn().mockResolvedValue(undefined),
  lockAccount: vi.fn().mockResolvedValue(undefined),
  resetFailedAttempts: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}))

import { loginUsuario } from '@/back/services/authService'
import {
  findByCodigoEmpleado,
  incrementFailedAttempts,
  lockAccount,
  resetFailedAttempts,
} from '@/back/repositories/userRepository'
import bcrypt from 'bcryptjs'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<{
  id: number
  codigoEmpleado: string
  nombreCompleto: string
  contrasena: string
  rol: string
  isActive: boolean
  lockedUntil: Date | null
  failedLoginAttempts: number
}> = {}) {
  return {
    id: 1,
    codigoEmpleado: 'EMP001',
    nombreCompleto: 'Juan Lopez',
    contrasena: '$2b$10$hashedpassword',
    rol: 'supervisor',
    isActive: true,
    lockedUntil: null,
    failedLoginAttempts: 0,
    ...overrides,
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('loginUsuario', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('login exitoso devuelve { ok: true, userId, rol, codigoEmpleado, nombreCompleto }', async () => {
    const user = makeUser()
    vi.mocked(findByCodigoEmpleado).mockResolvedValue(user as never)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const result = await loginUsuario('EMP001', 'correct-pass')

    expect(result).toEqual({
      ok: true,
      userId: 1,
      rol: 'supervisor',
      codigoEmpleado: 'EMP001',
      nombreCompleto: 'Juan Lopez',
    })
    expect(resetFailedAttempts).toHaveBeenCalledWith(1)
  })

  it('usuario no encontrado → { ok: false, reason: "not_found" }', async () => {
    vi.mocked(findByCodigoEmpleado).mockResolvedValue(null as never)

    const result = await loginUsuario('NOEXISTE', 'any-pass')

    expect(result).toEqual({ ok: false, reason: 'not_found' })
    expect(bcrypt.compare).not.toHaveBeenCalled()
  })

  it('contraseña incorrecta → { ok: false, reason: "wrong_password" }', async () => {
    const user = makeUser()
    vi.mocked(findByCodigoEmpleado).mockResolvedValue(user as never)
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

    const result = await loginUsuario('EMP001', 'wrong-pass')

    expect(result).toEqual({ ok: false, reason: 'wrong_password' })
    expect(incrementFailedAttempts).toHaveBeenCalledWith(1)
  })

  it('cuenta bloqueada (lockedUntil en el futuro) → { ok: false, reason: "locked" }', async () => {
    const user = makeUser({ lockedUntil: new Date(Date.now() + 60_000) })
    vi.mocked(findByCodigoEmpleado).mockResolvedValue(user as never)

    const result = await loginUsuario('EMP001', 'any-pass')

    expect(result).toEqual({ ok: false, reason: 'locked' })
    expect(bcrypt.compare).not.toHaveBeenCalled()
  })

  it('cuenta con lockedUntil en el pasado no se trata como bloqueada', async () => {
    const user = makeUser({ lockedUntil: new Date(Date.now() - 60_000) })
    vi.mocked(findByCodigoEmpleado).mockResolvedValue(user as never)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const result = await loginUsuario('EMP001', 'correct-pass')

    expect(result).toMatchObject({ ok: true })
  })

  it('usuario inactivo (isActive: false) → { ok: false, reason: "inactive" }', async () => {
    const user = makeUser({ isActive: false })
    vi.mocked(findByCodigoEmpleado).mockResolvedValue(user as never)

    const result = await loginUsuario('EMP001', 'any-pass')

    expect(result).toEqual({ ok: false, reason: 'inactive' })
    expect(bcrypt.compare).not.toHaveBeenCalled()
  })

  it('después de 5 intentos fallidos → bloquea la cuenta', async () => {
    const user = makeUser({ failedLoginAttempts: 4 })
    vi.mocked(findByCodigoEmpleado).mockResolvedValue(user as never)
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

    const result = await loginUsuario('EMP001', 'wrong')

    expect(result).toEqual({ ok: false, reason: 'wrong_password' })
    expect(lockAccount).toHaveBeenCalledWith(1, expect.any(Date))
    expect(incrementFailedAttempts).not.toHaveBeenCalled()
  })
})
