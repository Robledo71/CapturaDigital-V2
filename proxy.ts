import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/back/services/session'

const PUBLIC_ROUTES = ['/', '/tablet/login', '/reset-password']

// Roles permitidos por portal. El lider reutiliza el portal de supervisor y el de
// capturación, así que se incluye en ambos (su rol es 'lider', no 'supervisor').
const ROLE_ROUTES: Record<string, string[]> = {
  '/admin': ['admin'],
  '/supervisor': ['supervisor', 'lider'],
  '/capturacion': ['capturacion', 'lider'],
  '/gerente': ['gerente'],
  '/servicio-cliente': ['servicio_cliente'],
}

// Portal de aterrizaje de cada rol. DEBE ser un portal donde ese rol esté permitido
// (ver ROLE_ROUTES) para no provocar bucles de redirección.
function landingFor(rol: string): string {
  switch (rol) {
    case 'admin':            return '/admin'
    case 'supervisor':       return '/supervisor'
    case 'lider':            return '/supervisor'
    case 'gerente':          return '/gerente'
    case 'servicio_cliente': return '/servicio-cliente'
    case 'capturacion':      return '/capturacion'
    default:                 return '/capturacion'
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isPublic = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))

  const token = req.cookies.get('session')?.value
  const session = await decrypt(token)

  // Not authenticated → redirect to home login
  if (!session) {
    if (isPublic) return NextResponse.next()
    return NextResponse.redirect(new URL('/', req.nextUrl))
  }

  // Authenticated on a public route → redirect to their dashboard
  if (isPublic) {
    return NextResponse.redirect(new URL(landingFor(session.rol), req.nextUrl))
  }

  // Role-gated routes
  for (const [route, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(route)) {
      if (!allowedRoles.includes(session.rol)) {
        return NextResponse.redirect(new URL(landingFor(session.rol), req.nextUrl))
      }
      break
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.(?:png|ico|svg|jpg|jpeg)$).*)'],
}
