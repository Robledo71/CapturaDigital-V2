// POST /api/tablet/sessions/[id]/finalizar
// Closes an in-progress InspectionSession, rolls up totals into the DailyReport,
// and marks the OrderItem as completed.

import { NextResponse } from 'next/server'
import { authenticateTabletRequest } from '@/back/services/tabletAuth'
import { finalizarSesion } from '@/back/services/tabletApiService'

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

  const result = await finalizarSesion(sessionId, auth.tabletId)

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status },
    )
  }

  return NextResponse.json({ ok: true, ...result.data }, { status: 200 })
}
