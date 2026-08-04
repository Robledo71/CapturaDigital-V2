import { redirect } from 'next/navigation'
import { TopBar } from '@/front/components/supervisor/TopBar'
import { CargaDeTrabajoPage } from '@/front/components/supervisor/CargaDeTrabajoPage'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getCargaDeTrabajoData, getAvailableInspectors } from '@/back/services/cargaDeTrabajoService'
import { AccesoRestringido } from '@/front/components/ui/AccesoRestringido'

export const metadata = {
  title: 'Carga de trabajo — Captura Digital',
}

export default async function CargaDeTrabajoRoute() {
  const session = await getSession()
  if (!session) redirect('/')
  if (!can(session, 'ordenes.ver')) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar crumb="Carga de trabajo" />
        <AccesoRestringido mensaje="No tienes permiso para ver la carga de trabajo." />
      </div>
    )
  }

  const [orders, inspectors] = await Promise.all([
    getCargaDeTrabajoData(session.accessToken),
    getAvailableInspectors(session.accessToken, null),
  ])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar crumb="Carga de trabajo" />
      <CargaDeTrabajoPage orders={orders} inspectors={inspectors} rol={session.rol} permisos={session.permisos} />
    </div>
  )
}
