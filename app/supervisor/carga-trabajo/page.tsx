import { redirect } from 'next/navigation'
import { TopBar } from '@/front/components/supervisor/TopBar'
import { CargaDeTrabajoPage } from '@/front/components/supervisor/CargaDeTrabajoPage'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getCargaDeTrabajoData, getAvailableInspectors } from '@/back/services/cargaDeTrabajoService'
import { getInformalOrders } from '@/back/services/informalOrdersService'
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

  // Órdenes informales solo si el usuario puede verlas — se usan para marcar
  // "ocupado" a los inspectores con sesión activa en trabajos informales.
  const canVerInformales = can(session, 'ordenes_informales.ver')

  const [orders, inspectors, informalOrders] = await Promise.all([
    getCargaDeTrabajoData(session.accessToken),
    getAvailableInspectors(session.accessToken, null),
    canVerInformales
      ? getInformalOrders(session.accessToken).catch(() => [])
      : Promise.resolve([]),
  ])

  // empleado_id únicos de inspectores con sesión activa en órdenes informales.
  const informalBusyInspectorIds = [
    ...new Set(informalOrders.flatMap((o) => o.inspectores.map((i) => i.id))),
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar crumb="Carga de trabajo" />
      <CargaDeTrabajoPage
        orders={orders}
        inspectors={inspectors}
        informalBusyInspectorIds={informalBusyInspectorIds}
        rol={session.rol}
        permisos={session.permisos}
      />
    </div>
  )
}
