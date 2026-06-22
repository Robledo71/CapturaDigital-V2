'use server'

import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import {
  getUserPermisos,
  updateUserRevokes,
  type UserPermisos,
  type UpdateUserRevokesResult,
} from '@/back/services/permisosService'

export type GetUserPermisosResult =
  | { ok: true; data: UserPermisos }
  | { ok: false; error: string }

/** Carga el baseline del rol + revokes de un usuario para el modal. */
export async function getUserPermisosAction(userId: number): Promise<GetUserPermisosResult> {
  const session = await getSession()
  if (!session || !can(session, 'permisos.configurar')) {
    return { ok: false, error: 'No autorizado.' }
  }
  try {
    const data = await getUserPermisos(userId, session.accessToken)
    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error al cargar permisos.' }
  }
}

/** Guarda los permisos revocados de un usuario (revoke-only sobre el baseline del rol). */
export async function updateUserPermisosAction(
  userId: number,
  revokedKeys: string[],
): Promise<UpdateUserRevokesResult> {
  const session = await getSession()
  if (!session || !can(session, 'permisos.configurar')) {
    return { ok: false, error: 'No autorizado.' }
  }
  return updateUserRevokes(userId, revokedKeys, session.accessToken)
}
