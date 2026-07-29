import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { getInformalOrders } from '@/back/services/informalOrdersService'
import { getAllClientes } from '@/back/services/clientService'
import { getAllPlantas } from '@/back/services/plantService'
import { getAvailableInspectors } from '@/back/services/cargaDeTrabajoService'
import { TopBar } from '@/front/components/admin/TopBar'
import { OrdenesInformalesPage } from '@/front/components/supervisor/OrdenesInformalesPage'

export const metadata = {
  title: 'Órdenes informales — Captura Digital',
}

export default async function OrdenesInformalesRoute() {
  const session = await getSession()
  if (!session) redirect('/')

  const [orders, clientes, plantas, inspectors] = await Promise.all([
    getInformalOrders(session.accessToken),
    getAllClientes(session.accessToken),
    getAllPlantas(session.accessToken),
    getAvailableInspectors(session.accessToken),
  ])

  return (
    <>
      <TopBar crumb="Órdenes informales" />
      <OrdenesInformalesPage
        orders={orders}
        clientes={clientes}
        plantas={plantas}
        inspectors={inspectors}
        rol={session.rol}
        permisos={session.permisos}
      />
    </>
  )
}
