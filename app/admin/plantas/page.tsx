import { TopBar } from '@/front/components/supervisor/TopBar'
import { PlantasPage } from '@/front/components/admin/PlantasPage'
import { getAllPlantas, getRegiones } from '@/back/services/plantService'
import { getSession } from '@/back/services/session'

export default async function Page() {
  const session = await getSession()
  const accessToken = session?.accessToken ?? ''
  const [plantas, regiones] = await Promise.all([
    getAllPlantas(accessToken),
    getRegiones(accessToken),
  ])

  return (
    <>
      <TopBar crumb="Plantas" homeHref="/admin" />
      <PlantasPage initialPlantas={plantas} regiones={regiones} />
    </>
  )
}
