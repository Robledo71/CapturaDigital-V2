import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getPublishedReportes } from '@/back/services/publishedReportesService'
import { OrdenesClient } from '@/front/components/servicio-cliente/OrdenesClient'

export const metadata = { title: 'Órdenes — Servicio al Cliente' }

export default async function OrdenesServicioClientePage() {
  const session = await getSession()
  if (!session || !can(session, 'ordenes.ver')) redirect('/')

  const data = await getPublishedReportes(session.accessToken)
  return <OrdenesClient stats={data.stats} rows={data.rows} canDescargar={can(session, 'ordenes.descargar')} />
}
