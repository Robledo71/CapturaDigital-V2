import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getInformalReportes } from '@/back/services/informalReportesService'
import { ReportesInformalesPage } from '@/front/components/supervisor/ReportesInformalesPage'
import { AccesoRestringido } from '@/front/components/ui/AccesoRestringido'

export const metadata = {
  title: 'Reportes informales — Servicio al Cliente',
}

export default async function ReportesInformalesServicioClientePage() {
  const session = await getSession()
  if (!session) redirect('/')
  if (!can(session, 'reportes_informales.ver')) {
    return <AccesoRestringido mensaje="No tienes permiso para ver los reportes informales." />
  }

  const reportes = await getInformalReportes(session.accessToken)

  return (
    <ReportesInformalesPage reportes={reportes} detailHrefBase="/servicio-cliente/reportes-informales" />
  )
}
