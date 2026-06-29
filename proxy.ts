import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/back/services/session'

const PUBLIC_ROUTES = ['/', '/tablet/login', '/reset-password']
const ROLE_ROUTES: Record<string, string> = {
  '/admin': 'admin',
  '/supervisor': 'supervisor',
  '/capturacion': 'capturacion',
  '/gerente': 'gerente',
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
    const dest =
      session.rol === 'admin' ? '/admin' :
      session.rol === 'supervisor' ? '/supervisor' :
      session.rol === 'gerente' ? '/gerente' : '/capturacion'
    return NextResponse.redirect(new URL(dest, req.nextUrl))
  }

  // Role-gated routes
  for (const [route, requiredRol] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(route)) {
      if (session.rol !== requiredRol) {
        const dest =
          session.rol === 'admin' ? '/admin' :
          session.rol === 'supervisor' ? '/supervisor' :
          session.rol === 'gerente' ? '/gerente' : '/capturacion'
        return NextResponse.redirect(new URL(dest, req.nextUrl))
      }
      break
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.(?:png|ico|svg|jpg|jpeg)$).*)'],
}
