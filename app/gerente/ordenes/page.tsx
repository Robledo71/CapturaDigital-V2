import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getCargaDeTrabajoData } from '@/back/services/cargaDeTrabajoService'
import { CargaDeTrabajoPage } from '@/front/components/supervisor/CargaDeTrabajoPage'

export const metadata = {
  title: 'Órdenes — Gerencia',
}

export default async function GerenteOrdenesPage() {
  const session = await getSession()
  if (!session || !can(session, 'ordenes.ver')) redirect('/')

  const orders = await getCargaDeTrabajoData(session.accessToken)

  return (
    <CargaDeTrabajoPage
      orders={orders}
      tablets={[]}
      rol={session.rol}
      permisos={session.permisos}
    />
  )
}
