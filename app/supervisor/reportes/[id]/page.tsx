import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getReporteDetalle } from '@/back/services/reporteDetalleService'
import { TopBar } from '@/front/components/supervisor/TopBar'
import { ReporteDetallePage } from '@/front/components/supervisor/ReporteDetallePage'
import { AutoRefresh } from '@/front/components/supervisor/AutoRefresh'
import { AccesoRestringido } from '@/front/components/ui/AccesoRestringido'

export const metadata = {
  title: 'Detalle del reporte — Captura Digital',
}

export default async function ReporteDetallePageRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
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

  const { id } = await params
  const reporte = await getReporteDetalle(id, session.accessToken)

  if (!reporte) notFound()

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar crumb={reporte.consecutiveNumber} />
      <ReporteDetallePage reporte={reporte} rol={session.rol} permisos={session.permisos} />
      <AutoRefresh />
    </div>
  )
}
