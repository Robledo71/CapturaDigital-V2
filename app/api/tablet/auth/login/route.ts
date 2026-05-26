// POST /api/tablet/auth/login
// Authenticates a tablet by codigoTablet and returns a long-lived JWT.
// No user session required — this is the Flutter kiosk entry point.

import { NextResponse } from 'next/server'
import { prisma } from '@/back/db/prisma'
import { signTabletToken } from '@/back/services/tabletAuth'
import { tabletLoginSchema } from '@/back/validators/tabletApiSchemas'

export async function POST(request: Request) {
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'INVALID_JSON', message: 'El cuerpo debe ser JSON válido' },
      { status: 400 },
    )
  }

  const parsed = tabletLoginSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'VALIDATION_FAILED',
        message: 'Payload inválido',
        issues: parsed.error.issues,
      },
      { status: 400 },
    )
  }

  const { codigoTablet } = parsed.data

  const tablet = await prisma.tablet.findUnique({
    where: { codigoTablet },
    include: { plant: { select: { name: true } } },
  })

  if (!tablet || tablet.status !== 'activa') {
    return NextResponse.json(
      { ok: false, error: 'UNAUTHORIZED', message: 'Código inválido o tablet inactiva' },
      { status: 401 },
    )
  }

  const token = await signTabletToken({ tabletId: tablet.id, codigoTablet: tablet.codigoTablet })

  // Update lastSeenAt without blocking the response on failure
  prisma.tablet
    .update({ where: { id: tablet.id }, data: { lastSeenAt: new Date() } })
    .catch(() => {/* non-critical — ignore */})

  return NextResponse.json(
    {
      ok: true,
      token,
      tablet: {
        id: tablet.id,
        alias: tablet.alias ?? null,
        codigoTablet: tablet.codigoTablet,
        plantId: tablet.plantId ?? null,
        plantName: tablet.plant?.name ?? null,
      },
    },
    { status: 200 },
  )
}
