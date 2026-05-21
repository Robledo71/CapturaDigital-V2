import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export type JWTPayload = {
  userId: string
  rol: 'admin' | 'supervisor' | 'capturacion' | 'lider'
  codigoEmpleado: string
  nombreCompleto: string
  expiresAt: string
}

const secret = new TextEncoder().encode(process.env.SESSION_SECRET!)
const COOKIE = 'session'
const EXPIRY = '8h'

export async function encrypt(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(secret)
}

export async function decrypt(token: string | undefined): Promise<JWTPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export async function createSession(payload: Omit<JWTPayload, 'expiresAt'>) {
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000)
  const token = await encrypt({ ...payload, expiresAt: expiresAt.toISOString() })
  const cookieStore = await cookies()
  // No expires/maxAge → session cookie: the browser deletes it on close
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE)
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE)?.value
  return decrypt(token)
}
