// tests/unit/actions/supervisor-login.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/back/services/session', () => ({
  createSession: vi.fn(),
  getSession: vi.fn(),
}))

// next/navigation redirect está en el alias del vitest.config.ts
// pero lo necesitamos como vi.fn() real que NO lanza, para poder inspeccionar llamadas
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(),
}))

import { createSession } from '@/back/services/session'
import { redirect } from 'next/navigation'
import { loginSupervisor } from '@/app/actions/supervisor-login'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFormData(overrides: Partial<{
  employee_number: string
  password: string
}> = {}): FormData {
  const defaults = {
    employee_number: 'EMP001',
    password: 'secret1234',
    ...overrides,
  }
  const fd = new FormData()
  for (const [key, value] of Object.entries(defaults)) {
    fd.append(key, value)
  }
  return fd
}

function makeSuccessBody(overrides: Partial<{
  rol: string
  id: number
  nombreCompleto: string
  plantaId: number | null
  plantaNombre: string | null
}> = {}) {
  return {
    success: true,
    data: {
      accessToken: 'access-token-abc',
      refreshToken: 'refresh-token-xyz',
      user: {
        id: 1,
        rol: 'supervisor',
        nombreCompleto: 'Ana Torres',
        plantaId: 5,
        plantaNombre: 'Honda Celaya',
        ...overrides,
      },
    },
  }
}

function makeOkFetchResponse(body: object) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

function makeFailFetchResponse(body: object) {
  return {
    ok: false,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('loginSupervisor', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'test-app-token'
    // createSession no debe hacer nada por defecto
    vi.mocked(createSession).mockResolvedValue(undefined)
    // redirect no lanza en nuestros mocks — simplemente registra la llamada
    vi.mocked(redirect).mockImplementation((_url: string) => {
      // intencional: no lanza, solo registra
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // 1. Campos vacíos → error Zod
  it('employee_number vacío → errors.employee_number contiene mensaje', async () => {
    const result = await loginSupervisor(undefined, makeFormData({ employee_number: '' }))

    expect(result).toMatchObject({
      errors: {
        employee_number: expect.arrayContaining([expect.any(String)]),
      },
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  // 2. Contraseña vacía → error Zod
  it('password vacío → errors.password contiene mensaje', async () => {
    const result = await loginSupervisor(undefined, makeFormData({ password: '' }))

    expect(result).toMatchObject({
      errors: {
        password: expect.arrayContaining([expect.any(String)]),
      },
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  // 3. QB API → not_found
  it('QB API devuelve reason: "not_found" → errors.general: "Credenciales incorrectas."', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFailFetchResponse({ success: false, reason: 'not_found' }),
    )

    const result = await loginSupervisor(undefined, makeFormData())

    expect(result).toMatchObject({
      errors: { general: ['Credenciales incorrectas.'] },
    })
    expect(createSession).not.toHaveBeenCalled()
  })

  // 4. QB API → inactive
  it('QB API devuelve reason: "inactive" → errors.general con mensaje de cuenta desactivada', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFailFetchResponse({ success: false, reason: 'inactive' }),
    )

    const result = await loginSupervisor(undefined, makeFormData())

    expect(result).toMatchObject({
      errors: { general: expect.arrayContaining([expect.stringContaining('desactivada')]) },
    })
  })

  // 5. QB API → locked
  it('QB API devuelve reason: "locked" → errors.general con mensaje de cuenta bloqueada', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFailFetchResponse({ success: false, reason: 'locked' }),
    )

    const result = await loginSupervisor(undefined, makeFormData())

    expect(result).toMatchObject({
      errors: { general: expect.arrayContaining([expect.stringContaining('bloqueada')]) },
    })
  })

  // 6. Login exitoso con rol supervisor → redirige a /supervisor
  it('login exitoso con rol "supervisor" → redirect llamado con "/supervisor"', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkFetchResponse(makeSuccessBody({ rol: 'supervisor' })),
    )

    await loginSupervisor(undefined, makeFormData())

    expect(createSession).toHaveBeenCalledOnce()
    expect(redirect).toHaveBeenCalledWith('/supervisor')
  })

  // 7. Login exitoso con rol admin → redirige a /admin
  it('login exitoso con rol "admin" → redirect llamado con "/admin"', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkFetchResponse(makeSuccessBody({ rol: 'admin' })),
    )

    await loginSupervisor(undefined, makeFormData())

    expect(redirect).toHaveBeenCalledWith('/admin')
  })

  // 8. Login exitoso con rol capturacion → redirige a /capturacion
  it('login exitoso con rol "capturacion" → redirect llamado con "/capturacion"', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkFetchResponse(makeSuccessBody({ rol: 'capturacion' })),
    )

    await loginSupervisor(undefined, makeFormData())

    expect(redirect).toHaveBeenCalledWith('/capturacion')
  })

  // 9. Login exitoso con rol lider → redirige a /supervisor (mismo destino)
  it('login exitoso con rol "lider" → redirect llamado con "/supervisor"', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkFetchResponse(makeSuccessBody({ rol: 'lider' })),
    )

    await loginSupervisor(undefined, makeFormData())

    expect(redirect).toHaveBeenCalledWith('/supervisor')
  })

  // 10. Rol desconocido → error general
  it('rol desconocido "inspector" → errors.general con mensaje de rol no soportado', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkFetchResponse(makeSuccessBody({ rol: 'inspector' })),
    )

    const result = await loginSupervisor(undefined, makeFormData())

    expect(result).toMatchObject({
      errors: { general: expect.arrayContaining([expect.stringContaining('Rol')]) },
    })
    expect(redirect).not.toHaveBeenCalled()
  })

  // 11. Error de red → error de conexión
  it('fetch lanza → errors.general con mensaje de conexión', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'))

    const result = await loginSupervisor(undefined, makeFormData())

    expect(result).toMatchObject({
      errors: { general: expect.arrayContaining([expect.stringContaining('conectar')]) },
    })
    expect(createSession).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  // 12. createSession recibe los datos correctos del usuario
  it('createSession es llamado con userId, rol y datos de sesión correctos', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkFetchResponse(
        makeSuccessBody({ rol: 'supervisor', id: 42, nombreCompleto: 'Ana Torres' }),
      ),
    )

    await loginSupervisor(undefined, makeFormData({ employee_number: 'EMP999' }))

    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        rol: 'supervisor',
        codigoEmpleado: 'EMP999',
        nombreCompleto: 'Ana Torres',
        accessToken: 'access-token-abc',
        refreshToken: 'refresh-token-xyz',
      }),
    )
  })

  // 13. Respuesta con body no parseable → trata como error
  it('fetch con json malformado → errors.general', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
    } as unknown as Response)

    const result = await loginSupervisor(undefined, makeFormData())

    // Cuando res.json() falla, el .catch(() => ({})) del código produce body = {}
    // y body.success === false/undefined, por lo que devuelve error general
    expect(result).toMatchObject({ errors: { general: expect.any(Array) } })
  })
})
