import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getInformalReporteDetalle } from '@/back/services/informalReportesService'
import { ReporteDetallePage } from '@/front/components/supervisor/ReporteDetallePage'
import { AutoRefresh } from '@/front/components/supervisor/AutoRefresh'
import { AccesoRestringido } from '@/front/components/ui/AccesoRestringido'

export const metadata = {
  title: 'Detalle del reporte informal — Gerencia',
}

export default async function GerenteReporteInformalDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/')
  if (!can(session, 'reportes_informales.ver')) {
    return <AccesoRestringido mensaje="No tienes permiso para ver los reportes informales." />
  }

  const { id } = await params
  const reporte = await getInformalReporteDetalle(id, session.accessToken)

  if (!reporte) notFound()

  // Gerente es solo lectura y nunca ve el botón "Firmar" (su rol no tiene
  // reportes_informales.firmar) — se deja currentUserHasSignature en false.
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ReporteDetallePage
        reporte={reporte}
        rol={session.rol}
        permisos={session.permisos}
        backHref="/gerente/reportes-informales"
        variant="informal"
        currentUserHasSignature={false}
      />
      <AutoRefresh />
    </div>
  )
}
