import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can, canAny } from '@/front/lib/permisos'
import { getCotizaciones } from '@/back/services/cotizacionesService'
import { DesbloquearCotizacionesClient } from '@/front/components/capturacion/DesbloquearCotizacionesClient'

export const metadata = { title: 'Desbloquear Cotizaciones — Servicio al Cliente' }

export default async function DesbloquearServicioClientePage() {
  const session = await getSession()
  if (!session || !canAny(session, ['cotizaciones.bloquear', 'cotizaciones.desbloquear'])) {
    redirect('/')
  }

  const cotizaciones = await getCotizaciones(session.accessToken)

  return (
    <DesbloquearCotizacionesClient
      cotizaciones={cotizaciones}
      canBlockAll={can(session, 'cotizaciones.bloquear')}
    />
  )
}
