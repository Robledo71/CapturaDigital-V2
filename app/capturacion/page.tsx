import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { ReportesPublicadosClient } from '@/front/components/capturacion/ReportesPublicadosClient'
import { getPublishedReportes } from '@/back/services/publishedReportesService'

export const metadata = { title: 'Capturación — Captura Digital' }

export default async function CapturacionPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const data = await getPublishedReportes(session.accessToken)
  return <ReportesPublicadosClient stats={data.stats} rows={data.rows} canDescargar={can(session, 'ordenes.descargar')} />
}
