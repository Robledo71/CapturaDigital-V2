import { ReportesPublicadosClient } from '@/front/components/capturacion/ReportesPublicadosClient'
import { getPublishedReportes } from '@/back/services/publishedReportesService'

export const metadata = { title: 'Capturación — Captura Digital' }

export default async function CapturacionPage() {
  const data = await getPublishedReportes()
  return <ReportesPublicadosClient stats={data.stats} rows={data.rows} />
}
