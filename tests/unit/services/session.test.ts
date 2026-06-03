// tests/unit/services/session.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { SignJWT } from 'jose'

// SESSION_SECRET debe estar definido antes de que el módulo lo importe
beforeAll(() => {
  process.env.SESSION_SECRET = 'test-secret-32-chars-minimum-aaaa'
})

// Importamos después de que process.env esté configurado
// Usamos imports dinámicos para que la resolución ocurra en runtime
import { encrypt, decrypt, type JWTPayload } from '@/back/services/session'

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
