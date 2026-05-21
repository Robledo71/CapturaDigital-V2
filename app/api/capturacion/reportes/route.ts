import { getSession } from '@/back/services/session'
import { getPublishedReportes } from '@/back/services/publishedReportesService'

const ALLOWED_ROLES = new Set(['capturacion', 'admin', 'lider'] as const)

export async function GET() {
  const session = await getSession()

  if (!session || !ALLOWED_ROLES.has(session.rol as (typeof ALLOWED_ROLES extends Set<infer T> ? T : never))) {
    return Response.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const result = await getPublishedReportes()

  return Response.json(result)
}
