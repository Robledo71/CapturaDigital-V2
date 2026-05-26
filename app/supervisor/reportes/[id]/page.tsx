import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { getReporteDetalle } from '@/back/services/reporteDetalleService'
import { TopBar } from '@/front/components/supervisor/TopBar'
import { ReporteDetallePage } from '@/front/components/supervisor/ReporteDetallePage'
import { AutoRefresh } from '@/front/components/supervisor/AutoRefresh'

export const metadata = {
  title: 'Detalle del reporte — Captura Digital',
}

export default async function ReporteDetallePageRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params
  const reporte = await getReporteDetalle(id, String(session.userId))

  if (!reporte) notFound()

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar crumb={reporte.consecutiveNumber} />
      <ReporteDetallePage reporte={reporte} />
      <AutoRefresh />
    </div>
  )
}
