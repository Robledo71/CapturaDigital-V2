import { TopBar } from '@/front/components/admin/TopBar'
import { UsuariosPage } from '@/front/components/admin/UsuariosPage'
import { getAllUsuarios } from '@/back/services/userService'
import { getAllPlantas } from '@/back/services/plantService'
import { getSession } from '@/back/services/session'

export default async function Page() {
  const session = await getSession()
  const accessToken = session?.accessToken ?? ''

  // Trae TODOS los usuarios de una vez; la paginación se maneja en el cliente.
  const [usuarios, plantas] = await Promise.all([
    getAllUsuarios(accessToken),
    getAllPlantas(accessToken),
  ])

  return (
    <>
      <TopBar crumb="Usuarios" />
      <UsuariosPage
        initialUsuarios={usuarios}
        currentUserId={String(session?.userId ?? '')}
        plantas={plantas}
      />
    </>
  )
}
