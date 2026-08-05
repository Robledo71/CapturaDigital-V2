import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { getInformalReportes } from '@/back/services/informalReportesService'
import { TopBar } from '@/front/components/supervisor/TopBar'
import { ReportesInformalesPage } from '@/front/components/supervisor/ReportesInformalesPage'

export const metadata = {
  title: 'Reportes informales — Captura Digital',
}

export default async function ReportesInformalesRoute() {
  const session = await getSession()
  if (!session) redirect('/')

  const reportes = await getInformalReportes(session.accessToken)

  return (
    <>
      <TopBar crumb="Reportes informales" homeHref="/superusuario" />
      <ReportesInformalesPage reportes={reportes} detailHrefBase="/superusuario/reportes-informales" />
    </>
  )
}
