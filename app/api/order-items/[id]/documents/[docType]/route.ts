import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'

type RouteContext = {
  params: Promise<{ id: string; docType: string }>
}

const VALID_DOC_TYPES = new Set(['hoe', 'arranque-seguro'])

/**
 * Proxy autenticado para ver/descargar los documentos (HOE / Arranque Seguro) de
 * un order_item. El endpoint de qb_sync exige `Authorization: Bearer`, header que
 * un `<a href>` del browser no puede mandar — así que este route handler lee la
 * sesión server-side, agrega el Bearer + X-App-Token, y reenvía el archivo.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getSession()
  if (!session || !can(session, 'ordenes.documentos')) {
    return Response.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id, docType } = await params
  const itemId = Number(id)
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return Response.json({ ok: false, error: 'ID de item inválido' }, { status: 400 })
  }
  if (!VALID_DOC_TYPES.has(docType)) {
    return Response.json({ ok: false, error: 'Tipo de documento inválido' }, { status: 400 })
  }

  const upstream = await fetch(
    `${process.env.QSYNC_API_URL}/qb_sync/order-items/${itemId}/documents/${docType}`,
    {
      headers: {
        'X-App-Token': process.env.X_APP_TOKEN ?? '',
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: 'no-store',
    },
  )

  if (!upstream.ok) {
    const status = upstream.status === 404 ? 404 : 502
    return Response.json(
      { ok: false, error: status === 404 ? 'Documento no encontrado' : 'Error al obtener el documento' },
      { status },
    )
  }

  const buffer = await upstream.arrayBuffer()
  const headers = new Headers()
  const contentType = upstream.headers.get('content-type')
  if (contentType) headers.set('Content-Type', contentType)
  const disposition = upstream.headers.get('content-disposition')
  if (disposition) headers.set('Content-Disposition', disposition)
  headers.set('Cache-Control', 'no-store')

  return new Response(buffer, { status: 200, headers })
}
