// tests/unit/actions/supervisor-login.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock de cookies() de Next: el action las setea en login exitoso.
const cookieSet = vi.fn()
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ set: cookieSet, get: vi.fn(), delete: vi.fn() })),
}))

// redirect() y createSession() en el flujo de éxito.
const redirectMock = vi.fn()
vi.mock('next/navigation', () => ({
  redirect: (url: string) => redirectMock(url),
}))

const createSessionMock = vi.fn()
vi.mock('@/back/services/session', () => ({
  createSession: (payload: unknown) => createSessionMock(payload),
}))

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

// Forma NUEVA del backend reestructurado: data.{accessToken,refreshToken,tipo,rol,permisos}
function makeSuccessBody(overrides: Partial<{
  tipo: string
  rol: string
  permisos: string[]
}> = {}) {
  return {
    success: true,
    data: {
      accessToken: 'access-token-abc',
      refreshToken: 'refresh-token-xyz',
      tipo: 'empleado',
      rol: 'ADMIN',
      permisos: ['ADMIN.VER', 'REPORTES.VER'],
      ...overrides,
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
    cookieSet.mockClear()
    redirectMock.mockClear()
    createSessionMock.mockClear()
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

  // 6. Login exitoso → crea sesión y redirige al portal del rol
  it('login exitoso (rol admin) → createSession y redirect a /admin', async () => {
    vi.mocked(fetch).mockResolvedValue(makeOkFetchResponse(makeSuccessBody({ rol: 'ADMIN' })))

    await loginSupervisor(undefined, makeFormData())

    expect(createSessionMock).toHaveBeenCalledOnce()
    expect(redirectMock).toHaveBeenCalledWith('/admin')
  })

  // 6a. Login exitoso rol superusuario → redirige a /superusuario
  it('login exitoso (rol superusuario) → redirect a /superusuario', async () => {
    vi.mocked(fetch).mockResolvedValue(makeOkFetchResponse(makeSuccessBody({ rol: 'SUPERUSUARIO' })))

    await loginSupervisor(undefined, makeFormData())

    expect(redirectMock).toHaveBeenCalledWith('/superusuario')
  })

  // 6b. El body enviado al backend incluye codigo_usuario, contrasena y origen: 'WEB'
  it('envía codigo_usuario, contrasena y origen WEB al backend', async () => {
    vi.mocked(fetch).mockResolvedValue(makeOkFetchResponse(makeSuccessBody()))

    await loginSupervisor(undefined, makeFormData({ employee_number: 'SUPERVISOR' }))

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(init!.body as string)).toEqual({
      codigo_usuario: 'SUPERVISOR',
      contrasena: 'secret1234',
      origen: 'WEB',
    })
  })

  // 6c. Login exitoso → setea las cookies access_token y refresh_token
  it('login exitoso → setea cookies access_token y refresh_token', async () => {
    vi.mocked(fetch).mockResolvedValue(makeOkFetchResponse(makeSuccessBody()))

    await loginSupervisor(undefined, makeFormData())

    expect(cookieSet).toHaveBeenCalledWith(
      'access_token',
      'access-token-abc',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
    )
    expect(cookieSet).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token-xyz',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
    )
  })

  // 6d. Login fallido → NO setea cookies
  it('login fallido → no setea cookies', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFailFetchResponse({ success: false, reason: 'not_found' }),
    )

    await loginSupervisor(undefined, makeFormData())

    expect(cookieSet).not.toHaveBeenCalled()
  })

  // 6e. Cuenta de mobile (wrong_app) → blocked: true + mensaje de acceso
  it('reason "wrong_app" → blocked true y mensaje de acceso a la aplicación', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFailFetchResponse({ success: false, reason: 'wrong_app' }),
    )

    const result = await loginSupervisor(undefined, makeFormData())

    expect(result?.blocked).toBe(true)
    expect(result?.errors?.general?.[0]).toMatch(/acceso a esta aplicación/i)
    expect(cookieSet).not.toHaveBeenCalled()
  })

  // 6f. reason en MAYÚSCULAS ("WRONG_APP") también dispara blocked
  it('reason "WRONG_APP" (mayúsculas) → blocked true', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFailFetchResponse({ success: false, reason: 'WRONG_APP' }),
    )

    const result = await loginSupervisor(undefined, makeFormData())

    expect(result?.blocked).toBe(true)
  })

  // 6g. Otros errores NO marcan blocked
  it('reason "not_found" → blocked no se activa', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFailFetchResponse({ success: false, reason: 'not_found' }),
    )

    const result = await loginSupervisor(undefined, makeFormData())

    expect(result?.blocked).toBe(false)
  })

  // 7. Login exitoso → createSession recibe rol y permisos normalizados a minúsculas
  it('login exitoso → createSession con rol y permisos en minúsculas', async () => {
    const body = makeSuccessBody({
      rol: 'SUPERVISOR',
      permisos: ['SUPERVISOR.VER', 'REPORTES.EDITAR'],
    })
    vi.mocked(fetch).mockResolvedValue(makeOkFetchResponse(body))

    await loginSupervisor(undefined, makeFormData())

    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'empleado',
        rol: 'supervisor',
        permisos: ['supervisor.ver', 'reportes.editar'],
        accessToken: 'access-token-abc',
        refreshToken: 'refresh-token-xyz',
      }),
    )
    expect(redirectMock).toHaveBeenCalledWith('/supervisor')
  })

  // 8. Respuesta ok pero sin data → tratado como error, no redirige
  it('respuesta ok sin data → errors.general', async () => {
    vi.mocked(fetch).mockResolvedValue(makeOkFetchResponse({ success: true }))

    const result = await loginSupervisor(undefined, makeFormData())

    expect(result).toMatchObject({ errors: { general: expect.any(Array) } })
    expect(redirectMock).not.toHaveBeenCalled()
    expect(createSessionMock).not.toHaveBeenCalled()
  })

  // 9. Error de red → error de conexión
  it('fetch lanza → errors.general con mensaje de conexión', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'))

    const result = await loginSupervisor(undefined, makeFormData())

    expect(result).toMatchObject({
      errors: { general: expect.arrayContaining([expect.stringContaining('conectar')]) },
    })
    expect(redirectMock).not.toHaveBeenCalled()
  })

  // 10. Respuesta con body no parseable → trata como error
  it('fetch con json malformado → errors.general', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
    } as unknown as Response)

    const result = await loginSupervisor(undefined, makeFormData())

    expect(result).toMatchObject({ errors: { general: expect.any(Array) } })
  })
})
