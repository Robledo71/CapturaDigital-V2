// tests/unit/actions/employee-code.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/back/services/userService', () => ({
  getNextCodigoEmpleado: vi.fn(),
  checkCodigoEmpleadoExists: vi.fn(),
}))

import { getSession } from '@/back/services/session'
import { getNextCodigoEmpleado, checkCodigoEmpleadoExists } from '@/back/services/userService'
import { getNextEmployeeCodeAction, checkEmployeeCodeAction } from '@/app/actions/employee-code'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function adminSession() {
  return {
    userId: 1,
    rol: 'admin' as const,
    codigoEmpleado: 'ADMIN001',
    nombreCompleto: 'Admin User',
    plantaId: null,
    plantaNombre: null,
    accessToken: 'admin-token',
    refreshToken: 'refresh-token',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  }
}

function supervisorSession() {
  return { ...adminSession(), rol: 'supervisor' as const }
}

// ─── getNextEmployeeCodeAction ────────────────────────────────────────────────

describe('getNextEmployeeCodeAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin sesión → { codigo: null }', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const result = await getNextEmployeeCodeAction()

    expect(result).toEqual({ codigo: null })
    expect(getNextCodigoEmpleado).not.toHaveBeenCalled()
  })

  it('rol sin permiso usuarios.crud (supervisor) → { codigo: null }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())

    const result = await getNextEmployeeCodeAction()

    expect(result).toEqual({ codigo: null })
    expect(getNextCodigoEmpleado).not.toHaveBeenCalled()
  })

  it('admin con código disponible → retorna { codigo: "0002" }', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(getNextCodigoEmpleado).mockResolvedValue('0002')

    const result = await getNextEmployeeCodeAction()

    expect(result).toEqual({ codigo: '0002' })
    expect(getNextCodigoEmpleado).toHaveBeenCalledWith('admin-token')
  })

  it('servicio retorna null (fallo de red) → { codigo: null }', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(getNextCodigoEmpleado).mockResolvedValue(null)

    const result = await getNextEmployeeCodeAction()

    expect(result).toEqual({ codigo: null })
  })

  it('servicio lanza error → { codigo: null } (no propaga)', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(getNextCodigoEmpleado).mockRejectedValue(new Error('Network error'))

    await expect(getNextEmployeeCodeAction()).resolves.toEqual({ codigo: null })
  })
})

// ─── checkEmployeeCodeAction ──────────────────────────────────────────────────

describe('checkEmployeeCodeAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin sesión → { exists: false }', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const result = await checkEmployeeCodeAction('0005')

    expect(result).toEqual({ exists: false })
    expect(checkCodigoEmpleadoExists).not.toHaveBeenCalled()
  })

  it('rol sin permiso (supervisor) → { exists: false }', async () => {
    vi.mocked(getSession).mockResolvedValue(supervisorSession())

    const result = await checkEmployeeCodeAction('0005')

    expect(result).toEqual({ exists: false })
    expect(checkCodigoEmpleadoExists).not.toHaveBeenCalled()
  })

  it('código vacío → { exists: false } sin llamar al servicio', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())

    const result = await checkEmployeeCodeAction('   ')

    expect(result).toEqual({ exists: false })
    expect(checkCodigoEmpleadoExists).not.toHaveBeenCalled()
  })

  it('código string vacío → { exists: false } sin llamar al servicio', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())

    const result = await checkEmployeeCodeAction('')

    expect(result).toEqual({ exists: false })
    expect(checkCodigoEmpleadoExists).not.toHaveBeenCalled()
  })

  it('código existente → { exists: true }', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(checkCodigoEmpleadoExists).mockResolvedValue(true)

    const result = await checkEmployeeCodeAction('0001')

    expect(result).toEqual({ exists: true })
    expect(checkCodigoEmpleadoExists).toHaveBeenCalledWith('0001', 'admin-token')
  })

  it('código no existente → { exists: false }', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(checkCodigoEmpleadoExists).mockResolvedValue(false)

    const result = await checkEmployeeCodeAction('0099')

    expect(result).toEqual({ exists: false })
    expect(checkCodigoEmpleadoExists).toHaveBeenCalledWith('0099', 'admin-token')
  })

  it('trim del código antes de llamar al servicio', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(checkCodigoEmpleadoExists).mockResolvedValue(false)

    await checkEmployeeCodeAction('  0005  ')

    expect(checkCodigoEmpleadoExists).toHaveBeenCalledWith('0005', 'admin-token')
  })

  it('error de red → { exists: false } (no bloquea)', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession())
    vi.mocked(checkCodigoEmpleadoExists).mockRejectedValue(new Error('Network timeout'))

    await expect(checkEmployeeCodeAction('0005')).resolves.toEqual({ exists: false })
  })
})
