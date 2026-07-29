import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getInformalReportes } from '@/back/services/informalReportesService'
import { TopBar } from '@/front/components/supervisor/TopBar'
import { ReportesInformalesPage } from '@/front/components/supervisor/ReportesInformalesPage'
import { AutoRefresh } from '@/front/components/supervisor/AutoRefresh'
import { AccesoRestringido } from '@/front/components/ui/AccesoRestringido'

export const metadata = {
  title: 'Reportes informales — Captura Digital',
}

export default async function ReportesInformalesRoute() {
  const session = await getSession()
  if (!session) redirect('/')
  if (!can(session, 'reportes_informales.ver')) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar crumb="Reportes informales" />
        <AccesoRestringido mensaje="No tienes permiso para ver los reportes informales." />
      </div>
    )
  }

  const reportes = await getInformalReportes(session.accessToken)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar crumb="Reportes informales" />
      <ReportesInformalesPage reportes={reportes} detailHrefBase="/supervisor/reportes-informales" />
      <AutoRefresh />
    </div>
  )
}
