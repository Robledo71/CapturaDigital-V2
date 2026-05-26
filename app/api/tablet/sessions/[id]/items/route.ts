// POST /api/tablet/sessions/[id]/items
// Submits one or more InspectionItems to an in-progress session.
// Accepts an optional Idempotency-Key header (UUID) — deduplication is a
// planned enhancement (TODO post-MVP).

import { NextResponse } from 'next/server'
import { authenticateTabletRequest } from '@/back/services/tabletAuth'
import { submitInspectionItems } from '@/back/services/tabletApiService'
import { submitItemsSchema } from '@/back/validators/tabletApiSchemas'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateTabletRequest(request)
  if (!auth) {
    return NextResponse.json(
      { ok: false, error: 'UNAUTHORIZED', message: 'Token inválido o expirado' },
      { status: 401 },
    )
  }

  const { id: rawId } = await params
  const sessionId = parseInt(rawId, 10)
  if (isNaN(sessionId)) {
    return NextResponse.json(
      { ok: false, error: 'INVALID_PARAM', message: 'id debe ser un entero' },
      { status: 400 },
    )
  }

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'INVALID_JSON', message: 'El cuerpo debe ser JSON válido' },
      { status: 400 },
    )
  }

  const parsed = submitItemsSchema.safeParse(rawBody)
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

  const result = await submitInspectionItems(sessionId, auth.tabletId, parsed.data.items)

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status },
    )
  }

  return NextResponse.json({ ok: true, ...result.data }, { status: 200 })
}
