import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { getCotizaciones } from '@/back/services/cotizacionesService'
import { DesbloquearCotizacionesClient } from '@/front/components/capturacion/DesbloquearCotizacionesClient'

export const metadata = { title: 'Desbloquear Cotizaciones — Captura Digital' }

export default async function DesbloquearCotizacionesPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const cotizaciones = await getCotizaciones(session.accessToken)

  return <DesbloquearCotizacionesClient cotizaciones={cotizaciones} />
}
