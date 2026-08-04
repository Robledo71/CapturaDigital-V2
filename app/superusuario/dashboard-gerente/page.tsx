import { getSession } from '@/back/services/session'
import { getGerenteDashboard } from '@/back/services/gerenteDashboardService'
import { GerenteDashboard } from '@/front/components/gerente/GerenteDashboard'

export const metadata = {
  title: 'Gerencia — Captura Digital',
}

export default async function DashboardGerentePage() {
  const session = await getSession()
  const data = await getGerenteDashboard(session?.accessToken ?? '')

  return <GerenteDashboard data={data} />
}
