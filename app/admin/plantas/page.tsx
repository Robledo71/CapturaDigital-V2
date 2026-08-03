import { TopBar } from '@/front/components/supervisor/TopBar'
import { PlantasPage } from '@/front/components/admin/PlantasPage'
import { getAllPlantas } from '@/back/services/plantService'
import { getSession } from '@/back/services/session'

export default async function Page() {
  const session = await getSession()
  const accessToken = session?.accessToken ?? ''
  const plantas = await getAllPlantas(accessToken)

  return (
    <>
      <TopBar crumb="Plantas" homeHref="/admin" />
      <PlantasPage initialPlantas={plantas} />
    </>
  )
}
