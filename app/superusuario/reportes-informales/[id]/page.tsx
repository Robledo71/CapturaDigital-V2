import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { getInformalReporteDetalle } from '@/back/services/informalReportesService'
import { TopBar } from '@/front/components/admin/TopBar'
import { ReporteDetallePage } from '@/front/components/supervisor/ReporteDetallePage'

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

  const { id } = await params
  const reporte = await getInformalReporteDetalle(id, session.accessToken)

  if (!reporte) notFound()

  return (
    <>
      <TopBar crumb={reporte.consecutiveNumber} />
      <ReporteDetallePage
        reporte={reporte}
        rol={session.rol}
        permisos={session.permisos}
        backHref="/superusuario/reportes-informales"
        variant="informal"
      />
    </>
  )
}
