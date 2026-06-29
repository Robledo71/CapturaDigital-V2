import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getSupervisorReportes } from '@/back/services/reportesService'
import { ReportesPage } from '@/front/components/supervisor/ReportesPage'
import { AccesoRestringido } from '@/front/components/ui/AccesoRestringido'

export const metadata = {
  title: 'Reportes — Gerencia',
}

export default async function GerenteReportesPage() {
  const session = await getSession()
  if (!session) redirect('/')
  if (!can(session, 'reportes.ver')) {
    return <AccesoRestringido mensaje="No tienes permiso para ver los reportes." />
  }

  // Trae todos los reportes (global para gerente); la paginación ocurre en el cliente.
  const { rows: reportes } = await getSupervisorReportes(String(session.userId), session.accessToken)

  // Solo lectura: detalle apunta al portal de gerencia y se oculta el botón "Nuevo".
  return (
    <ReportesPage
      initialReportes={reportes}
      detailHrefBase="/gerente/reportes"
      newReportHref={null}
    />
  )
}
