import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { getInspectores } from '@/back/services/inspectorService'
import { getAllPlantas } from '@/back/services/plantService'
import { TopBar } from '@/front/components/admin/TopBar'
import { InspectoresPage } from '@/front/components/supervisor/InspectoresPage'

export const metadata = {
  title: 'Inspectores — Captura Digital',
}

export default async function InspectoresRoute() {
  const session = await getSession()
  if (!session) redirect('/')

  const [{ inspectors, count, limit }, plantas] = await Promise.all([
    getInspectores(session.accessToken),
    getAllPlantas(session.accessToken),
  ])

  return (
    <>
      <TopBar crumb="Inspectores" />
      <InspectoresPage
        initialInspectors={inspectors}
        count={count}
        limit={limit}
        rol={session.rol}
        plantas={plantas}
      />
    </>
  )
}
