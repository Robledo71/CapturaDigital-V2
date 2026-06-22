import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getSupervisorReportes } from '@/back/services/reportesService'
import { TopBar } from '@/front/components/supervisor/TopBar'
import { ReportesPage } from '@/front/components/supervisor/ReportesPage'
import { AutoRefresh } from '@/front/components/supervisor/AutoRefresh'
import { AccesoRestringido } from '@/front/components/ui/AccesoRestringido'

export const metadata = {
  title: 'Reportes de inspección — Captura Digital',
}

export default async function ReportesRoute() {
  const session = await getSession()
  if (!session) redirect('/')
  if (!can(session, 'reportes.ver')) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar crumb="Reportes" />
        <AccesoRestringido mensaje="No tienes permiso para ver los reportes." />
      </div>
    )
  }

  // Trae todos los reportes; la paginación ocurre en el cliente.
  const { rows: reportes } = await getSupervisorReportes(String(session.userId), session.accessToken)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar crumb="Reportes" />
      <ReportesPage initialReportes={reportes} />
      <AutoRefresh />
    </div>
  )
}
