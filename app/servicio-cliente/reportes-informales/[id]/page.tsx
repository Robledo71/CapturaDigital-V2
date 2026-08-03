import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getInformalReporteDetalle } from '@/back/services/informalReportesService'
import { ReporteDetallePage } from '@/front/components/supervisor/ReporteDetallePage'
import { AccesoRestringido } from '@/front/components/ui/AccesoRestringido'

export const metadata = {
  title: 'Detalle del reporte informal — Servicio al Cliente',
}

export default async function ReporteInformalDetalleServicioClienteRoute({
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

  // Servicio al cliente es solo lectura sobre reportes informales: los botones de
  // muestreo/editar/firmar se ocultan vía can() porque su rol no tiene esos permisos.
  // currentUserHasSignature se deja en false — este rol nunca ve "Firmar reporte".
  return (
    <ReporteDetallePage
      reporte={reporte}
      rol={session.rol}
      permisos={session.permisos}
      backHref="/servicio-cliente/reportes-informales"
      variant="informal"
      currentUserHasSignature={false}
    />
  )
}
