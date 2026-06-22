import { redirect } from 'next/navigation'
import { TopBar } from '@/front/components/admin/TopBar'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getPermisosConfig } from '@/back/services/permisosService'
import { PermisosMatrix } from '@/front/components/admin/PermisosMatrix'

export default async function Page() {
  const session = await getSession()
  if (!session || !can(session, 'permisos.configurar')) redirect('/')

  const config = await getPermisosConfig(session.accessToken)

  return (
    <>
      <TopBar crumb="Permisos" />
      <PermisosMatrix
        permissions={config.permissions}
        matrix={config.matrix}
        editableRoles={config.editableRoles}
      />
    </>
  )
}
