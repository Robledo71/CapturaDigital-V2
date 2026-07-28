// tests/unit/proxy.test.ts
//
// Cobertura del refresh proactivo en proxy.ts. decrypt/encrypt/getAccessTokenExp/
// refreshTokens se mockean para no depender de jose ni de un backend real — lo
// que probamos acá es el ENRUTAMIENTO de proxy.ts según lo que esas funciones
// devuelven (refresca / no refresca / falla), no la criptografía en sí (eso ya
// lo cubre session.test.ts).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const decryptMock = vi.fn()
const encryptMock = vi.fn()
const getAccessTokenExpMock = vi.fn()
const refreshTokensMock = vi.fn()

vi.mock('@/back/services/session', () => ({
  decrypt: (token: string | undefined) => decryptMock(token),
  encrypt: (payload: unknown) => encryptMock(payload),
  getAccessTokenExp: (token: string) => getAccessTokenExpMock(token),
  refreshTokens: (token: string) => refreshTokensMock(token),
}))

import { proxy } from '@/proxy'

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    userId: 1,
    tipo: 'empleado',
    rol: 'capturacion',
    codigoEmpleado: 'EMP001',
    nombreCompleto: 'Ana Torres',
    empleadoId: 1,
    plantaIds: [1],
    plantaId: 1,
    plantaNombre: 'Planta 1',
    accessToken: 'access-old',
    refreshToken: 'refresh-old',
    expiresAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeRequest(pathname: string, sessionCookie?: string): NextRequest {
  const req = new NextRequest(new URL(`https://app.local${pathname}`))
  if (sessionCookie) {
    req.cookies.set('session', sessionCookie)
  }
  return req
}

function setCookieNames(res: Response): string[] {
  // Node's Headers.getSetCookie() junta todos los Set-Cookie individuales.
  const raw = (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? []
  return raw.map((c) => c.split('=')[0])
}

describe('proxy', () => {
  beforeEach(() => {
    decryptMock.mockReset()
    encryptMock.mockReset()
    getAccessTokenExpMock.mockReset()
    refreshTokensMock.mockReset()
  })

  it('sin sesión en ruta protegida → redirect a /', async () => {
    decryptMock.mockResolvedValue(null)

    const res = await proxy(makeRequest('/capturacion'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://app.local/')
  })

  it('sin sesión en ruta pública → deja pasar (next)', async () => {
    decryptMock.mockResolvedValue(null)

    const res = await proxy(makeRequest('/'))

    expect(res.headers.get('x-middleware-next')).toBe('1')
  })

  it('accessToken todavía vigente (> 120s) → no llama a refreshTokens y deja pasar', async () => {
    const session = makeSession()
    decryptMock.mockResolvedValue(session)
    getAccessTokenExpMock.mockReturnValue(Math.floor(Date.now() / 1000) + 900) // +15min

    const res = await proxy(makeRequest('/capturacion', 'encrypted-session-token'))

    expect(refreshTokensMock).not.toHaveBeenCalled()
    expect(res.headers.get('x-middleware-next')).toBe('1')
    expect(setCookieNames(res)).toEqual([])
  })

  it('accessToken por vencer (< 120s) → refresca y setea session/access_token/refresh_token en la respuesta', async () => {
    const session = makeSession()
    decryptMock.mockResolvedValue(session)
    getAccessTokenExpMock.mockReturnValue(Math.floor(Date.now() / 1000) + 30) // 30s de vida
    refreshTokensMock.mockResolvedValue({ accessToken: 'access-new', refreshToken: 'refresh-new' })
    encryptMock.mockResolvedValue('encrypted-new-session')

    const res = await proxy(makeRequest('/capturacion', 'encrypted-session-token'))

    expect(refreshTokensMock).toHaveBeenCalledWith('refresh-old')
    expect(encryptMock).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'access-new', refreshToken: 'refresh-new' }),
    )
    expect(res.headers.get('x-middleware-next')).toBe('1')
    expect(setCookieNames(res).sort()).toEqual(['access_token', 'refresh_token', 'session'])
  })

  it('accessToken ya vencido (exp en el pasado) → también refresca', async () => {
    const session = makeSession()
    decryptMock.mockResolvedValue(session)
    getAccessTokenExpMock.mockReturnValue(Math.floor(Date.now() / 1000) - 60) // vencido hace 60s
    refreshTokensMock.mockResolvedValue({ accessToken: 'access-new', refreshToken: 'refresh-new' })
    encryptMock.mockResolvedValue('encrypted-new-session')

    await proxy(makeRequest('/capturacion', 'encrypted-session-token'))

    expect(refreshTokensMock).toHaveBeenCalledWith('refresh-old')
  })

  it('exp no legible (getAccessTokenExp → null) → refresca por precaución', async () => {
    const session = makeSession()
    decryptMock.mockResolvedValue(session)
    getAccessTokenExpMock.mockReturnValue(null)
    refreshTokensMock.mockResolvedValue({ accessToken: 'access-new', refreshToken: 'refresh-new' })
    encryptMock.mockResolvedValue('encrypted-new-session')

    await proxy(makeRequest('/capturacion', 'encrypted-session-token'))

    expect(refreshTokensMock).toHaveBeenCalled()
  })

  it('refresh_token inválido/expirado (refreshTokens → null) en ruta protegida → redirect a / con cookies limpiadas', async () => {
    const session = makeSession()
    decryptMock.mockResolvedValue(session)
    getAccessTokenExpMock.mockReturnValue(Math.floor(Date.now() / 1000) + 30)
    refreshTokensMock.mockResolvedValue(null)

    const res = await proxy(makeRequest('/capturacion', 'encrypted-session-token'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://app.local/')
    // Cookies limpiadas → Set-Cookie con valor vacío/expirado para las 3.
    expect(setCookieNames(res).sort()).toEqual(['access_token', 'refresh_token', 'session'])
  })

  it('refresh fallido en ruta pública → NO redirige (evita loop), solo limpia cookies', async () => {
    const session = makeSession()
    decryptMock.mockResolvedValue(session)
    getAccessTokenExpMock.mockReturnValue(Math.floor(Date.now() / 1000) + 30)
    refreshTokensMock.mockResolvedValue(null)

    const res = await proxy(makeRequest('/', 'encrypted-session-token'))

    expect(res.headers.get('x-middleware-next')).toBe('1')
    expect(setCookieNames(res).sort()).toEqual(['access_token', 'refresh_token', 'session'])
  })

  it('sesión válida en ruta pública → redirect al landing del rol', async () => {
    const session = makeSession({ rol: 'admin' })
    decryptMock.mockResolvedValue(session)
    getAccessTokenExpMock.mockReturnValue(Math.floor(Date.now() / 1000) + 900)

    const res = await proxy(makeRequest('/', 'encrypted-session-token'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://app.local/admin')
  })

  it('rol sin permiso para el portal → redirect a su landing', async () => {
    const session = makeSession({ rol: 'capturacion' })
    decryptMock.mockResolvedValue(session)
    getAccessTokenExpMock.mockReturnValue(Math.floor(Date.now() / 1000) + 900)

    const res = await proxy(makeRequest('/admin', 'encrypted-session-token'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://app.local/capturacion')
  })

  it('superusuario → bypass total, deja pasar en cualquier portal', async () => {
    const session = makeSession({ rol: 'superusuario' })
    decryptMock.mockResolvedValue(session)
    getAccessTokenExpMock.mockReturnValue(Math.floor(Date.now() / 1000) + 900)

    const res = await proxy(makeRequest('/admin', 'encrypted-session-token'))

    expect(res.headers.get('x-middleware-next')).toBe('1')
  })
})
