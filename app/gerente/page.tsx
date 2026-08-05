import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getGerenteDashboard } from '@/back/services/gerenteDashboardService'
import { TopBar } from '@/front/components/supervisor/TopBar'
import { GerenteDashboard } from '@/front/components/gerente/GerenteDashboard'

export const metadata = {
  title: 'Gerencia — Captura Digital',
}

export default async function GerentePage() {
  const session = await getSession()
  if (!session || !can(session, 'gerente.ver')) redirect('/')

  const data = await getGerenteDashboard(session.accessToken)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar homeHref="/gerente" />
      <GerenteDashboard data={data} />
    </div>
  )
}
