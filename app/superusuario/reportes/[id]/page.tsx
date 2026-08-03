import { notFound } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { getReporteDetalle } from '@/back/services/reporteDetalleService'
import { getSignatureStatus } from '@/back/services/signatureService'
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

  const { id } = await params
  const reporte = await getReporteDetalle(id, session?.accessToken ?? '')

  if (!reporte) notFound()

  const { hasSignature } = session ? await getSignatureStatus(session.accessToken) : { hasSignature: false }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar crumb={reporte.consecutiveNumber} />
      <ReporteDetallePage
        reporte={reporte}
        rol={session?.rol ?? ''}
        permisos={session?.permisos}
        backHref="/superusuario/reportes"
        currentUserHasSignature={hasSignature}
      />
      <AutoRefresh />
    </div>
  )
}
