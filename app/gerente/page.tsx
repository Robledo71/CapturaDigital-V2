import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getGerenteDashboard } from '@/back/services/gerenteDashboardService'
import { GerenteDashboard } from '@/front/components/gerente/GerenteDashboard'

export const metadata = {
  title: 'Gerencia — Captura Digital',
}

export default async function GerentePage() {
  const session = await getSession()
  if (!session || !can(session, 'gerente.ver')) redirect('/')

  const data = await getGerenteDashboard(session.accessToken)

  return <GerenteDashboard data={data} />
}
