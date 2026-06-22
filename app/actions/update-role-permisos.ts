'use server'

import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { updateRolePermisos, type UpdateRolePermisosResult } from '@/back/services/permisosService'

/**
 * Reemplaza los permisos de un rol desde la matriz de admin.
 * Guardado por `permisos.configurar` — la frontera real de seguridad (qb_sync además
 * exige rol admin a nivel de ruta). qb_sync rechaza editar el rol 'admin' (anti-lockout).
 */
export async function updateRolePermisosAction(
  rol: string,
  permissionKeys: string[],
): Promise<UpdateRolePermisosResult> {
  const session = await getSession()
  if (!session || !can(session, 'permisos.configurar')) {
    return { ok: false, error: 'No autorizado.' }
  }

  return updateRolePermisos(rol, permissionKeys, session.accessToken)
}
