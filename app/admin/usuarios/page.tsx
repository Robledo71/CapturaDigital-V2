import { TopBar } from '@/front/components/admin/TopBar'
import { UsuariosPage } from '@/front/components/admin/UsuariosPage'
import { getAllUsuarios } from '@/back/services/userService'
import { getAllPlantas } from '@/back/services/plantService'
import { getSession } from '@/back/services/session'

const PAGE_SIZE = 20

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function Page({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)

  const session = await getSession()
  const accessToken = session?.accessToken ?? ''

  const [allUsuarios, plantas] = await Promise.all([
    getAllUsuarios(accessToken),
    getAllPlantas(accessToken),
  ])

  const total = allUsuarios.length
  const start = (page - 1) * PAGE_SIZE
  const usuarios = allUsuarios.slice(start, start + PAGE_SIZE)

  return (
    <>
      <TopBar crumb="Usuarios" />
      <UsuariosPage
        initialUsuarios={usuarios}
        currentUserId={String(session?.userId ?? '')}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        plantas={plantas}
      />
    </>
  )
}
