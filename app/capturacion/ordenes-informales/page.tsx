import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { getInformalOrders } from '@/back/services/informalOrdersService'
import { InformalOrdersTable } from '@/front/components/informal-orders/InformalOrdersTable'

export const metadata = {
  title: 'Órdenes informales — Captura Digital',
}

export default async function OrdenesInformalesCapturacionPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const orders = await getInformalOrders(session.accessToken)

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Órdenes informales</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {orders.length} {orders.length === 1 ? 'orden informal' : 'órdenes informales'}
        </p>
      </div>
      <InformalOrdersTable orders={orders} />
    </div>
  )
}
