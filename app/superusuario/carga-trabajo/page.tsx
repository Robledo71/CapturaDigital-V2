import { TopBar } from '@/front/components/supervisor/TopBar'
import { CargaDeTrabajoPage } from '@/front/components/supervisor/CargaDeTrabajoPage'
import { getSession } from '@/back/services/session'
import { getCargaDeTrabajoData, getAvailableInspectors } from '@/back/services/cargaDeTrabajoService'

export const metadata = {
  title: 'Carga de trabajo — Captura Digital',
}

export default async function CargaDeTrabajoRoute() {
  const session = await getSession()
  const accessToken = session?.accessToken ?? ''

  const [orders, inspectors] = await Promise.all([
    getCargaDeTrabajoData(accessToken),
    getAvailableInspectors(accessToken, null),
  ])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar crumb="Carga de trabajo" />
      <CargaDeTrabajoPage orders={orders} inspectors={inspectors} rol={session?.rol ?? ''} permisos={session?.permisos} />
    </div>
  )
}
