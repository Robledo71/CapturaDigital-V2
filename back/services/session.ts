import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export type JWTPayload = {
  userId: number
  rol: 'admin' | 'supervisor' | 'capturacion' | 'lider' | 'servicio_cliente' | 'cliente'
  // Permisos efectivos que entrega qb_sync (acción fina). Opcional durante la
  // migración: si no viene, el frontend cae a la matriz por defecto en front/lib/permisos.ts.
  permisos?: string[]
  codigoEmpleado: string
  nombreCompleto: string
  plantaId: number | null
  plantaNombre: string | null
  accessToken: string
  refreshToken: string
  expiresAt: string
}

const COOKIE = 'session'
const EXPIRY = '8h'

// Resolve the secret lazily so importing this module never throws at evaluation
// time. Next.js imports route modules during `next build` to collect page data;
// throwing at top level would break the build even though the secret is only
// needed at runtime. The check still fails fast on the first actual use.
let cachedSecret: Uint8Array | null = null
function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET env var is not set — cannot use the session module')
  }
  cachedSecret = new TextEncoder().encode(process.env.SESSION_SECRET)
  return cachedSecret
}

export async function encrypt(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret())
}

export async function decrypt(token: string | undefined): Promise<JWTPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] })
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
