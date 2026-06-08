import { TopBar } from '@/front/components/admin/TopBar'
import { TabletsPage } from '@/front/components/admin/TabletsPage'
import { getAllTablets } from '@/back/services/tabletService'
import { getAllPlantas } from '@/back/services/plantService'
import { getSession } from '@/back/services/session'

export default async function Page() {
  const session = await getSession()
  const accessToken = session?.accessToken ?? ''

  // Trae TODAS las tablets de una vez; la paginación se maneja en el cliente.
  const [tablets, plantas] = await Promise.all([
    getAllTablets(accessToken),
    getAllPlantas(accessToken),
  ])

  return (
    <>
      <TopBar crumb="Tablets" />
      <TabletsPage initialTablets={tablets} plantas={plantas} />
    </>
  )
}
