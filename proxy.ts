import { NextRequest, NextResponse } from 'next/server'
import { decrypt, encrypt, getAccessTokenExp, refreshTokens, type JWTPayload } from '@/back/services/session'

const PUBLIC_ROUTES = ['/', '/reset-password']

// El accessToken embebido en la sesión vive 15 min (JWT_ACCESS_EXPIRES en el
// backend), muy por debajo de las 8h que dura la cookie 'session'. Sin un
// refresh proactivo, cualquier Server Component/Server Action que llame a
// qb_sync con `getSession().accessToken` después de esos 15 min recibe 401
// aunque el usuario siga "viéndose" logueado. Refrescamos cuando al access
// token le quedan <= 120s de vida (o ya venció / no se pudo leer su exp).
const REFRESH_THRESHOLD_MS = 120 * 1000

// Mismos TTLs que setea app/actions/supervisor-login.ts al hacer login, para
// que las cookies standalone access_token/refresh_token queden consistentes
// tras un refresh.
const ACCESS_TOKEN_MAX_AGE = 60 * 15            // 15 min
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7  // 7 días

const COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

// Roles permitidos por portal. El lider reutiliza el portal de supervisor y el de
// capturación, así que se incluye en ambos (su rol es 'lider', no 'supervisor').
const ROLE_ROUTES: Record<string, string[]> = {
  '/superusuario': ['superusuario'],
  '/admin': ['admin'],
  '/supervisor': ['supervisor', 'supervisor_regional', 'lider'],
  '/capturacion': ['capturacion', 'lider'],
  '/gerente': ['gerente'],
  '/servicio-cliente': ['servicio_cliente'],
}

// Portal de aterrizaje de cada rol. DEBE ser un portal donde ese rol esté permitido
// (ver ROLE_ROUTES) para no provocar bucles de redirección.
function landingFor(rol: string): string {
  switch (rol) {
    case 'superusuario':     return '/superusuario'
    case 'admin':            return '/admin'
    case 'supervisor':       return '/supervisor'
    case 'supervisor_regional': return '/supervisor'
    case 'lider':            return '/supervisor'
    case 'gerente':          return '/gerente'
    case 'servicio_cliente': return '/servicio-cliente'
    case 'capturacion':      return '/capturacion'
    default:                 return '/capturacion'
  }
}

type RefreshOutcome =
  | { status: 'unchanged' }
  | { status: 'failed' }
  | {
      status: 'refreshed'
      session: JWTPayload
      cookieToken: string
      accessToken: string
      refreshToken: string
    }

/**
 * Refresca proactivamente el accessToken de la sesión si está por vencer (o
 * ya venció). Si refresca con éxito, además muta `req.cookies` para que ESTE
 * mismo request/render vea el token nuevo.
 *
 * Por qué mutar `req.cookies` alcanza para "reenviar" la cookie al render
 * actual: `NextRequest.cookies` (RequestCookies, ver
 * node_modules/next/dist/server/web/spec-extension/request.js) envuelve
 * directamente `req.headers` — `req.cookies.set(...)` escribe el header
 * `Cookie` de ESE MISMO objeto Headers. Por eso alcanza con reenviar
 * `req.headers` vía `NextResponse.next({ request: { headers: req.headers } })`
 * (patrón "Setting Headers" documentado en
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
 * y en next-response.md, sección `next()`) para que el Server
 * Component/Server Action que se renderiza a continuación lea la cookie ya
 * actualizada. Aparte, cada respuesta que devolvemos (`NextResponse`) recibe
 * las mismas cookies vía `.cookies.set(...)` para que el navegador las
 * persista (`Set-Cookie`).
 *
 * Nota de concurrencia (aceptada, no resuelta aquí): qb_sync ROTA el
 * refresh_token en cada llamada — el que se usó queda inválido. Si dos
 * requests verdaderamente concurrentes (p.ej. dos pestañas del mismo
 * usuario) disparan un refresh casi al mismo tiempo, la segunda puede
 * intentar refrescar con un refresh_token que la primera ya invalidó y
 * perder la sesión. Dentro de UN solo render, todos los Server Components se
 * sirven de este único paso de proxy, así que ahí no hay carrera. El caso
 * multi-pestaña se acepta por ahora dado el uso interno de la app.
 */
async function refreshSessionIfNeeded(
  req: NextRequest,
  session: JWTPayload,
): Promise<RefreshOutcome> {
  const exp = getAccessTokenExp(session.accessToken)
  const needsRefresh = exp === null || exp * 1000 - Date.now() <= REFRESH_THRESHOLD_MS
  if (!needsRefresh) return { status: 'unchanged' }

  const refreshed = await refreshTokens(session.refreshToken)
  if (!refreshed) return { status: 'failed' }

  const newSession: JWTPayload = {
    ...session,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
  }
  const cookieToken = await encrypt(newSession)

  req.cookies.set('session', cookieToken)
  req.cookies.set('access_token', refreshed.accessToken)
  req.cookies.set('refresh_token', refreshed.refreshToken)

  return {
    status: 'refreshed',
    session: newSession,
    cookieToken,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
  }
}

function clearAuthCookies(res: NextResponse): NextResponse {
  res.cookies.delete('session')
  res.cookies.delete('access_token')
  res.cookies.delete('refresh_token')
  return res
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isPublic = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))

  const token = req.cookies.get('session')?.value
  let session = await decrypt(token)

  // Not authenticated → redirect to home login
  if (!session) {
    if (isPublic) return NextResponse.next()
    return NextResponse.redirect(new URL('/', req.nextUrl))
  }

  const refresh = await refreshSessionIfNeeded(req, session)

  if (refresh.status === 'failed') {
    // El refresh_token también está inválido/expirado → sesión irrecuperable.
    // En rutas públicas no hay a dónde redirigir (evita loops con '/'):
    // simplemente seguimos, ya limpiando las cookies muertas.
    if (isPublic) return clearAuthCookies(NextResponse.next())
    return clearAuthCookies(NextResponse.redirect(new URL('/', req.nextUrl)))
  }

  if (refresh.status === 'refreshed') {
    session = refresh.session
  }

  // Adjunta las cookies renovadas (si hubo refresh) a cualquier respuesta que
  // decidamos devolver desde acá en adelante.
  function withRefreshCookies(res: NextResponse): NextResponse {
    if (refresh.status === 'refreshed') {
      res.cookies.set('session', refresh.cookieToken, COOKIE_BASE)
      res.cookies.set('access_token', refresh.accessToken, { ...COOKIE_BASE, maxAge: ACCESS_TOKEN_MAX_AGE })
      res.cookies.set('refresh_token', refresh.refreshToken, { ...COOKIE_BASE, maxAge: REFRESH_TOKEN_MAX_AGE })
    }
    return res
  }

  // Authenticated on a public route → redirect to their dashboard
  if (isPublic) {
    return withRefreshCookies(NextResponse.redirect(new URL(landingFor(session.rol), req.nextUrl)))
  }

  // El superusuario puede entrar a absolutamente todos los portales/pantallas.
  if (session.rol === 'superusuario') {
    return withRefreshCookies(NextResponse.next({ request: { headers: req.headers } }))
  }

  // Role-gated routes
  for (const [route, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(route)) {
      if (!allowedRoles.includes(session.rol)) {
        return withRefreshCookies(NextResponse.redirect(new URL(landingFor(session.rol), req.nextUrl)))
      }
      break
    }
  }

  return withRefreshCookies(NextResponse.next({ request: { headers: req.headers } }))
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.(?:png|ico|svg|jpg|jpeg)$).*)'],
}
