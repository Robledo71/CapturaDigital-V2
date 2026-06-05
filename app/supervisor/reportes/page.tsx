import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { getSupervisorReportes } from '@/back/services/reportesService'
import { TopBar } from '@/front/components/supervisor/TopBar'
import { ReportesPage } from '@/front/components/supervisor/ReportesPage'
import { AutoRefresh } from '@/front/components/supervisor/AutoRefresh'

export const metadata = {
  title: 'Reportes de inspección — Captura Digital',
}

export default async function ReportesRoute() {
  const session = await getSession()
  if (!session) redirect('/')

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
