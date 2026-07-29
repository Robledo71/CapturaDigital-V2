import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getInformalReporteDetalle } from '@/back/services/informalReportesService'
import { TopBar } from '@/front/components/supervisor/TopBar'
import { ReporteDetallePage } from '@/front/components/supervisor/ReporteDetallePage'
import { AutoRefresh } from '@/front/components/supervisor/AutoRefresh'
import { AccesoRestringido } from '@/front/components/ui/AccesoRestringido'

export const metadata = {
  title: 'Detalle del reporte informal — Captura Digital',
}

export default async function ReporteInformalDetallePageRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
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

  const { id } = await params
  const reporte = await getInformalReporteDetalle(id, session.accessToken)

  if (!reporte) notFound()

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar crumb={reporte.consecutiveNumber} />
      <ReporteDetallePage
        reporte={reporte}
        rol={session.rol}
        permisos={session.permisos}
        backHref="/supervisor/reportes-informales"
        variant="informal"
      />
      <AutoRefresh />
    </div>
  )
}
