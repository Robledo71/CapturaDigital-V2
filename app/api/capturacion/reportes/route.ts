import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getPublishedReportes } from '@/back/services/publishedReportesService'

export async function GET() {
  const session = await getSession()

  if (!session || !can(session, 'ordenes.descargar')) {
    return Response.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const result = await getPublishedReportes(session.accessToken)

  return Response.json(result)
}
