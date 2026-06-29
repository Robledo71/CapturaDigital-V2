import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getReporteDetalle } from '@/back/services/reporteDetalleService'
import { ReporteDetallePage } from '@/front/components/supervisor/ReporteDetallePage'
import { AccesoRestringido } from '@/front/components/ui/AccesoRestringido'

export const metadata = {
  title: 'Detalle del reporte — Gerencia',
}

export default async function GerenteReporteDetalleRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/')
  if (!can(session, 'reportes.ver')) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <AccesoRestringido mensaje="No tienes permiso para ver los reportes." />
      </div>
    )
  }

  const { id } = await params
  const reporte = await getReporteDetalle(id, session.accessToken)

  if (!reporte) notFound()

  // Gerente es solo lectura: los botones de muestreo/firmar/publicar se ocultan
  // vía can() porque su rol no tiene esos permisos. El "volver" regresa a /gerente/reportes.
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ReporteDetallePage
        reporte={reporte}
        rol={session.rol}
        permisos={session.permisos}
        backHref="/gerente/reportes"
      />
    </div>
  )
}
