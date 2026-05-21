import { TopBar } from '@/front/components/admin/TopBar'
import { ClientesPage } from '@/front/components/admin/ClientesPage'
import { getAllClientes } from '@/back/services/clientService'

const PAGE_SIZE = 20

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function Page({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)

  const allClientes = await getAllClientes()
  const total = allClientes.length
  const start = (page - 1) * PAGE_SIZE
  const clientes = allClientes.slice(start, start + PAGE_SIZE)

  return (
    <>
      <TopBar crumb="Clientes" />
      <ClientesPage
        initialClientes={clientes}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </>
  )
}
