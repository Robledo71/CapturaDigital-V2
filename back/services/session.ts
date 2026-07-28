import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export type JWTPayload = {
  userId: number
  // 'empleado' | 'cliente' — QBSync v2.0 separa identidad (usuarios) de perfil.
  tipo: 'empleado' | 'cliente'
  rol: 'superusuario' | 'admin' | 'supervisor' | 'capturacion' | 'lider' | 'servicio_cliente' | 'cliente' | 'gerente'
  // Permisos efectivos que entrega el backend (acción fina), ya normalizados a
  // minúsculas. Opcional: si no viene, el frontend cae a la matriz SEED.
  permisos?: string[]
  codigoEmpleado: string
  nombreCompleto: string
  // empleado_id del usuario logueado (desde el JWT del backend). Se usa como
  // id_supervisor al asignar inspectores. null si el usuario no tiene empleado asociado.
  empleadoId: number | null
  // QBSync v2.0: un empleado puede pertenecer a varias plantas (empleados_plantas).
  plantaIds: number[]
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

/**
 * Decodifica el payload de un JWT SIN verificar firma, para leer su `exp`
 * (segundos, epoch Unix). El access token es emitido y firmado por qb_sync;
 * aquí solo necesitamos saber cuándo vence, no validarlo (eso ya lo hace
 * qb_sync en cada request). Devuelve `null` si el token es inválido/no trae
 * `exp`. Usable desde middleware (no toca `next/headers`).
 */
export function getAccessTokenExp(accessToken: string): number | null {
  try {
    const seg = accessToken.split('.')[1]
    const payload = JSON.parse(Buffer.from(seg, 'base64url').toString('utf8'))
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

/**
 * Renueva el par de tokens contra qb_sync. El backend ROTA ambos tokens en
 * cada llamada exitosa (el refresh_token usado queda invalidado), así que el
 * valor devuelto reemplaza por completo al anterior — nunca reutilizar el
 * refresh_token viejo después de llamar esto.
 *
 * Devuelve `null` ante cualquier fallo (refresh_token inválido/expirado,
 * respuesta no-ok, `success: false`, tokens faltantes, o error de red) para
 * que el caller trate la sesión como irrecuperable sin tener que distinguir
 * el motivo. No usa `next/headers`: es seguro llamarla desde middleware.
 */
export async function refreshTokens(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const res = await fetch(`${process.env.QSYNC_API_URL}/qb_sync/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Token': process.env.X_APP_TOKEN ?? '',
      },
      body: JSON.stringify({ refresh_token: refreshToken, origen: 'WEB' }),
      cache: 'no-store',
    })

    if (!res.ok) return null

    const body = await res.json().catch(() => null)
    if (!body || body.success !== true) return null

    const accessToken = body.data?.access_token
    const newRefreshToken = body.data?.refresh_token
    if (!accessToken || !newRefreshToken) return null

    return { accessToken, refreshToken: newRefreshToken }
  } catch {
    return null
  }
}
