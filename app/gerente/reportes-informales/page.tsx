import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getInformalReportes } from '@/back/services/informalReportesService'
import { ReportesInformalesPage } from '@/front/components/supervisor/ReportesInformalesPage'
import { AutoRefresh } from '@/front/components/supervisor/AutoRefresh'
import { AccesoRestringido } from '@/front/components/ui/AccesoRestringido'

export const metadata = {
  title: 'Reportes informales — Gerencia',
}

export default async function GerenteReportesInformalesPage() {
  const session = await getSession()
  if (!session) redirect('/')
  if (!can(session, 'reportes_informales.ver')) {
    return <AccesoRestringido mensaje="No tienes permiso para ver los reportes informales." />
  }

  const reportes = await getInformalReportes(session.accessToken)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ReportesInformalesPage reportes={reportes} detailHrefBase="/gerente/reportes-informales" />
      <AutoRefresh />
    </div>
  )
}
