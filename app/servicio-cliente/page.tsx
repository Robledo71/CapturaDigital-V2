import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getPublishedReportes } from '@/back/services/publishedReportesService'
import { TopBar } from '@/front/components/supervisor/TopBar'
import { OrdenesClient } from '@/front/components/servicio-cliente/OrdenesClient'
import { AccesoRestringido } from '@/front/components/ui/AccesoRestringido'

export const metadata = { title: 'Servicio al Cliente — Captura Digital' }

export default async function ServicioClientePage() {
  const session = await getSession()
  if (!session) redirect('/')

  if (!can(session, 'ordenes.ver')) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar homeHref="/servicio-cliente" />
        <AccesoRestringido mensaje="No tienes permiso para ver las órdenes." />
      </div>
    )
  }

  const data = await getPublishedReportes(session.accessToken)
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar homeHref="/servicio-cliente" />
      <OrdenesClient
        stats={data.stats}
        rows={data.rows}
        canDescargar={can(session, 'ordenes.descargar')}
      />
    </div>
  )
}
