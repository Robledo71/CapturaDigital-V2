import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getPublishedReportes } from '@/back/services/publishedReportesService'
import { OrdenesClient } from '@/front/components/servicio-cliente/OrdenesClient'

export const metadata = { title: 'Servicio al Cliente — Captura Digital' }

export default async function ServicioClientePage() {
  const session = await getSession()

  const data = await getPublishedReportes(session?.accessToken ?? '')
  return (
    <OrdenesClient
      stats={data.stats}
      rows={data.rows}
      canDescargar={can(session, 'ordenes.descargar')}
    />
  )
}
