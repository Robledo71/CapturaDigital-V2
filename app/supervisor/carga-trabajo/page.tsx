import { redirect } from 'next/navigation'
import { TopBar } from '@/front/components/supervisor/TopBar'
import { CargaDeTrabajoPage } from '@/front/components/supervisor/CargaDeTrabajoPage'
import { getSession } from '@/back/services/session'
import { getCargaDeTrabajoData, getAvailableTablets } from '@/back/services/cargaDeTrabajoService'

export const metadata = {
  title: 'Carga de trabajo — Captura Digital',
}

export default async function CargaDeTrabajoRoute() {
  const session = await getSession()
  if (!session) redirect('/login')

  const [orders, tablets] = await Promise.all([
    getCargaDeTrabajoData(session.userId),
    getAvailableTablets(),
  ])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar crumb="Carga de trabajo" />
      <CargaDeTrabajoPage orders={orders} tablets={tablets} />
    </div>
  )
}
