import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getPublishedReportes } from '@/back/services/publishedReportesService'
import { OrdenesClient } from '@/front/components/servicio-cliente/OrdenesClient'
import { AccesoRestringido } from '@/front/components/ui/AccesoRestringido'

export const metadata = { title: 'Servicio al Cliente — Captura Digital' }

export default async function ServicioClientePage() {
  const session = await getSession()
  if (!session) redirect('/')

  if (!can(session, 'ordenes.ver')) {
    return <AccesoRestringido mensaje="No tienes permiso para ver las órdenes." />
  }

  const data = await getPublishedReportes(session.accessToken)
  return (
    <OrdenesClient
      stats={data.stats}
      rows={data.rows}
      canDescargar={can(session, 'ordenes.descargar')}
    />
  )
}
