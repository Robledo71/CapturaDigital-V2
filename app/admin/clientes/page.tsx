import { redirect } from 'next/navigation'
import { TopBar } from '@/front/components/admin/TopBar'
import { ClientesPage } from '@/front/components/admin/ClientesPage'
import { getAllClientes } from '@/back/services/clientService'
import { getSession } from '@/back/services/session'

export default async function Page() {
  const session = await getSession()
  if (!session) redirect('/')

  const clientes = await getAllClientes(session.accessToken)

  return (
    <>
      <TopBar crumb="Clientes" />
      <ClientesPage initialClientes={clientes} />
    </>
  )
}
