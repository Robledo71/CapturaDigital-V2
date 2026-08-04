import { getSession } from '@/back/services/session'

/**
 * Proxy autenticado para la firma PROPIA. Un `<img src>` del navegador no puede
 * mandar el header `Authorization: Bearer`, así que este route handler lee la
 * sesión server-side, agrega Bearer + X-App-Token, y reenvía la imagen.
 * Mismo patrón que `app/api/order-items/[id]/documents/[docType]/route.ts`.
 */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const upstream = await fetch(`${process.env.QSYNC_API_URL}/qb_sync/signatures/me`, {
    headers: {
      'X-App-Token': process.env.X_APP_TOKEN ?? '',
      Authorization: `Bearer ${session.accessToken}`,
    },
    cache: 'no-store',
  })

  if (!upstream.ok) {
    const status = upstream.status === 404 ? 404 : 502
    return Response.json(
      { ok: false, error: status === 404 ? 'No tienes una firma configurada' : 'Error al obtener la firma' },
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
