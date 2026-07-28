// tests/unit/services/session.test.ts
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { SignJWT } from 'jose'

// SESSION_SECRET debe estar definido antes de que el módulo lo importe
beforeAll(() => {
  process.env.SESSION_SECRET = 'test-secret-32-chars-minimum-aaaa'
})

// Importamos después de que process.env esté configurado
// Usamos imports dinámicos para que la resolución ocurra en runtime
import { encrypt, decrypt, getAccessTokenExp, refreshTokens, type JWTPayload } from '@/back/services/session'

// Construye un "JWT" con el payload dado, sin firmar de verdad (no nos
// importa la firma: getAccessTokenExp no verifica, solo lee el segundo
// segmento). Sirve para simular el accessToken que manda qb_sync.
function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.fake-signature`
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePayload(overrides: Partial<JWTPayload> = {}): JWTPayload {
  return {
    userId: 42,
    rol: 'supervisor',
    codigoEmpleado: 'EMP001',
    nombreCompleto: 'Ana Torres',
    plantaId: 5,
    plantaNombre: 'Honda Celaya',
    accessToken: 'access-token-abc',
    refreshToken: 'refresh-token-xyz',
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  }
}

// ─── encrypt ─────────────────────────────────────────────────────────────────

describe('encrypt', () => {
  it('devuelve un string no vacío (el JWT)', async () => {
    const token = await encrypt(makePayload())
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
  })

  it('el JWT tiene el formato de tres segmentos base64 separados por puntos', async () => {
    const token = await encrypt(makePayload())
    const parts = token.split('.')
    expect(parts).toHaveLength(3)
  })

  it('el JWT contiene el campo rol correcto (decodificado sin verificar)', async () => {
    const payload = makePayload({ rol: 'admin' })
    const token = await encrypt(payload)
    const [, bodyB64] = token.split('.')
    // base64url → base64 estándar → JSON
    const padded = bodyB64.padEnd(bodyB64.length + (4 - (bodyB64.length % 4)) % 4, '=')
    const decoded = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'))
    expect(decoded.rol).toBe('admin')
  })
})

// ─── decrypt ─────────────────────────────────────────────────────────────────

describe('decrypt', () => {
  it('decrypt(encrypt(payload)) devuelve el payload con los mismos campos', async () => {
    const payload = makePayload()
    const token = await encrypt(payload)
    const result = await decrypt(token)

    expect(result).not.toBeNull()
    expect(result!.userId).toBe(payload.userId)
    expect(result!.rol).toBe(payload.rol)
    expect(result!.codigoEmpleado).toBe(payload.codigoEmpleado)
    expect(result!.nombreCompleto).toBe(payload.nombreCompleto)
    expect(result!.plantaId).toBe(payload.plantaId)
    expect(result!.plantaNombre).toBe(payload.plantaNombre)
  })

  it('decrypt(undefined) → null', async () => {
    const result = await decrypt(undefined)
    expect(result).toBeNull()
  })

  it('decrypt("") → null', async () => {
    const result = await decrypt('')
    expect(result).toBeNull()
  })

  it('decrypt("token-invalido") → null', async () => {
    const result = await decrypt('token-invalido')
    expect(result).toBeNull()
  })

  it('token con firma incorrecta → null', async () => {
    // Genera un JWT con un secreto distinto
    const otherSecret = new TextEncoder().encode('completely-different-secret-value')
    const forgedToken = await new SignJWT({ userId: 99, rol: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(otherSecret)

    const result = await decrypt(forgedToken)
    expect(result).toBeNull()
  })

  it('token expirado → null', async () => {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET)
    const expiredToken = await new SignJWT({ userId: 1, rol: 'supervisor' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('-1s')
      .sign(secret)

    const result = await decrypt(expiredToken)
    expect(result).toBeNull()
  })
})

// ─── getAccessTokenExp ───────────────────────────────────────────────────────

describe('getAccessTokenExp', () => {
  it('devuelve el exp (segundos epoch) del payload del JWT', () => {
    const exp = Math.floor(Date.now() / 1000) + 900 // +15 min, como qb_sync
    const token = fakeJwt({ sub: 1, exp })
    expect(getAccessTokenExp(token)).toBe(exp)
  })

  it('el payload no trae exp → null', () => {
    const token = fakeJwt({ sub: 1 })
    expect(getAccessTokenExp(token)).toBeNull()
  })

  it('token malformado (no tiene 3 segmentos válidos) → null', () => {
    expect(getAccessTokenExp('esto-no-es-un-jwt')).toBeNull()
  })

  it('string vacío → null', () => {
    expect(getAccessTokenExp('')).toBeNull()
  })
})

// ─── refreshTokens ───────────────────────────────────────────────────────────

describe('refreshTokens', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'test-app-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function okResponse(body: object) {
    return { ok: true, json: vi.fn().mockResolvedValue(body) } as unknown as Response
  }

  function failResponse(body: object = {}) {
    return { ok: false, json: vi.fn().mockResolvedValue(body) } as unknown as Response
  }

  it('200 con success:true → devuelve los tokens rotados', async () => {
    vi.mocked(fetch).mockResolvedValue(
      okResponse({ success: true, data: { access_token: 'new-access', refresh_token: 'new-refresh' } }),
    )

    const result = await refreshTokens('old-refresh')

    expect(result).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' })
  })

  it('llama al endpoint correcto con el refresh_token en el body y X-App-Token en headers', async () => {
    vi.mocked(fetch).mockResolvedValue(
      okResponse({ success: true, data: { access_token: 'a', refresh_token: 'r' } }),
    )

    await refreshTokens('old-refresh')

    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('http://localhost:3001/qb_sync/auth/refresh')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-App-Token': 'test-app-token',
    })
    expect(JSON.parse(init!.body as string)).toEqual({
      refresh_token: 'old-refresh',
      origen: 'WEB',
    })
  })

  it('respuesta no-ok → null', async () => {
    vi.mocked(fetch).mockResolvedValue(failResponse({ success: false }))

    const result = await refreshTokens('old-refresh')

    expect(result).toBeNull()
  })

  it('respuesta ok pero success:false → null', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({ success: false }))

    const result = await refreshTokens('old-refresh')

    expect(result).toBeNull()
  })

  it('respuesta ok, success:true pero sin tokens → null', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({ success: true, data: {} }))

    const result = await refreshTokens('old-refresh')

    expect(result).toBeNull()
  })

  it('fetch lanza (error de red) → null', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'))

    const result = await refreshTokens('old-refresh')

    expect(result).toBeNull()
  })

  it('json() no parseable → null', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockRejectedValue(new SyntaxError('bad json')),
    } as unknown as Response)

    const result = await refreshTokens('old-refresh')

    expect(result).toBeNull()
  })
})
