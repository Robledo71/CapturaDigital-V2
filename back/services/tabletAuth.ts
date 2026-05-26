import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { prisma } from '@/back/db/prisma'

const _rawSecret = process.env.TABLET_JWT_SECRET ?? process.env.SESSION_SECRET
if (!_rawSecret) {
  throw new Error('Neither TABLET_JWT_SECRET nor SESSION_SECRET is set — cannot initialize tablet JWT module')
}
const SECRET = new TextEncoder().encode(_rawSecret)
const ALG = 'HS256'
const EXPIRY = '30d'

export type TabletJwtPayload = {
  tabletId: number
  codigoTablet: string
}

export async function signTabletToken(payload: TabletJwtPayload): Promise<string> {
  return new SignJWT({ tabletId: payload.tabletId, codigoTablet: payload.codigoTablet })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.codigoTablet)
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(SECRET)
}

export async function verifyTabletToken(token: string): Promise<TabletJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, { algorithms: [ALG] })
    const tabletId = Number(payload['tabletId'])
    const codigoTablet = String(payload['codigoTablet'])
    if (!tabletId || !codigoTablet) return null
    return { tabletId, codigoTablet }
  } catch {
    return null
  }
}

/**
 * Authenticates a tablet request from the Authorization: Bearer <token> header.
 * Verifies the JWT, then cross-checks that the tablet still exists and is 'activa'.
 * Returns null on any failure — callers must return 401.
 */
export async function authenticateTabletRequest(
  req: Request,
): Promise<{ tabletId: number; codigoTablet: string } | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  const payload = await verifyTabletToken(token)
  if (!payload) return null

  // Verify tablet still exists and is active (handles revocation / status changes)
  const tablet = await prisma.tablet.findUnique({
    where: { id: payload.tabletId },
    select: { id: true, status: true, codigoTablet: true },
  })

  if (!tablet || tablet.status !== 'activa') return null
  // Reject if codigoTablet was rotated after the token was issued
  if (tablet.codigoTablet !== payload.codigoTablet) return null

  return { tabletId: tablet.id, codigoTablet: tablet.codigoTablet }
}
