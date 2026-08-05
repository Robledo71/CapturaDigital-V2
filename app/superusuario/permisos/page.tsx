import { TopBar } from '@/front/components/supervisor/TopBar'
import { getSession } from '@/back/services/session'
import { getPermisosConfig } from '@/back/services/permisosService'
import { PermisosMatrix } from '@/front/components/admin/PermisosMatrix'

export default async function Page() {
  const session = await getSession()
  const config = await getPermisosConfig(session?.accessToken ?? '')

  return (
    <>
      <TopBar crumb="Permisos" homeHref="/superusuario" />
      <PermisosMatrix
        permissions={config.permissions}
        matrix={config.matrix}
        editableRoles={config.editableRoles}
      />
    </>
  )
}
