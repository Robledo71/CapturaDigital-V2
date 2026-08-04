import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getInformalOrders } from '@/back/services/informalOrdersService'
import { OrdenesInformalesPage } from '@/front/components/supervisor/OrdenesInformalesPage'
import { AccesoRestringido } from '@/front/components/ui/AccesoRestringido'

export const metadata = {
  title: 'Órdenes informales — Gerencia',
}

export default async function GerenteOrdenesInformalesPage() {
  const session = await getSession()
  if (!session) redirect('/')
  if (!can(session, 'ordenes_informales.ver')) {
    return <AccesoRestringido mensaje="No tienes permiso para ver las órdenes informales." />
  }

  // Solo lectura: gerente no puede crear ni asignar (esos permisos gatean los
  // modales dentro del componente), por eso clientes/plantas/inspectores van vacíos.
  const orders = await getInformalOrders(session.accessToken)

  return (
    <OrdenesInformalesPage
      orders={orders}
      clientes={[]}
      plantas={[]}
      inspectors={[]}
      rol={session.rol}
      permisos={session.permisos}
    />
  )
}
