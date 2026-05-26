// GET /api/tablet/items
// Returns all OrderItems assigned to the authenticated tablet
// that are in 'assigned' or 'in_progress' status on an open, non-legacy order.

import { NextResponse } from 'next/server'
import { authenticateTabletRequest } from '@/back/services/tabletAuth'
import { getAssignedItemsForTablet } from '@/back/services/tabletApiService'

export async function GET(request: Request) {
  const auth = await authenticateTabletRequest(request)
  if (!auth) {
    return NextResponse.json(
      { ok: false, error: 'UNAUTHORIZED', message: 'Token inválido o expirado' },
      { status: 401 },
    )
  }

  const items = await getAssignedItemsForTablet(auth.tabletId)

  return NextResponse.json({ ok: true, items }, { status: 200 })
}
