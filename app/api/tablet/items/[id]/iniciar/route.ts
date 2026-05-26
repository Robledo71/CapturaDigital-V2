// POST /api/tablet/items/[id]/iniciar
// Starts an inspection session for the given OrderItem.
// Idempotent: if the item is already in_progress with an active session, returns it.

import { NextResponse } from 'next/server'
import { authenticateTabletRequest } from '@/back/services/tabletAuth'
import { iniciarInspeccion } from '@/back/services/tabletApiService'
import { iniciarItemSchema } from '@/back/validators/tabletApiSchemas'

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
  const orderItemId = parseInt(rawId, 10)
  if (isNaN(orderItemId)) {
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

  const parsed = iniciarItemSchema.safeParse(rawBody)
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

  const result = await iniciarInspeccion(orderItemId, auth.tabletId, parsed.data)

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status },
    )
  }

  return NextResponse.json({ ok: true, ...result.data }, { status: 201 })
}
