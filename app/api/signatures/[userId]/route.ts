import { getSession } from '@/back/services/session'

type RouteContext = {
  params: Promise<{ userId: string }>
}

/**
 * Proxy autenticado para la firma de OTRO usuario (el firmante real de un
 * reporte, mostrado en el paso "Firmado" del timeline). Cualquier staff
 * autenticado puede leerla — qb_sync no exige un permiso extra para este
 * endpoint (ver signatures.routes.js). Mismo patrón que
 * `app/api/order-items/[id]/documents/[docType]/route.ts`.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getSession()
  if (!session) {
    return Response.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { userId } = await params
  const id = Number(userId)
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ ok: false, error: 'userId inválido' }, { status: 400 })
  }

  const upstream = await fetch(`${process.env.QSYNC_API_URL}/qb_sync/signatures/${id}`, {
    headers: {
      'X-App-Token': process.env.X_APP_TOKEN ?? '',
      Authorization: `Bearer ${session.accessToken}`,
    },
    cache: 'no-store',
  })

  if (!upstream.ok) {
    const status = upstream.status === 404 ? 404 : 502
    return Response.json(
      { ok: false, error: status === 404 ? 'Este usuario no tiene una firma configurada' : 'Error al obtener la firma' },
      { status },
    )
  }

  const buffer = await upstream.arrayBuffer()
  const headers = new Headers()
  const contentType = upstream.headers.get('content-type')
  if (contentType) headers.set('Content-Type', contentType)
  headers.set('Cache-Control', 'no-store')

  return new Response(buffer, { status: 200, headers })
}
