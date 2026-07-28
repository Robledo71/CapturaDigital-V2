import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getCotizaciones } from '@/back/services/cotizacionesService'
import { DesbloquearCotizacionesClient } from '@/front/components/capturacion/DesbloquearCotizacionesClient'

export const metadata = { title: 'Desbloquear Cotizaciones — Captura Digital' }

export default async function DesbloquearCotizacionesPage() {
  const session = await getSession()

  const cotizaciones = await getCotizaciones(session?.accessToken ?? '')

  return (
    <DesbloquearCotizacionesClient
      cotizaciones={cotizaciones}
      canBlockAll={can(session, 'cotizaciones.bloquear')}
    />
  )
}
