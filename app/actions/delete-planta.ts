'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { deletePlanta } from '@/back/services/plantService'

export type DeletePlantaState = { ok?: true; error?: string } | undefined

export async function deletePlantaAction(
  _state: DeletePlantaState,
  formData: FormData,
): Promise<DeletePlantaState> {
  const session = await getSession()
  if (!session || !can(session, 'plantas.crud')) {
    return { error: 'No autorizado' }
  }

  const id = parseInt(String(formData.get('id') ?? ''), 10)
  if (isNaN(id)) {
    return { error: 'ID de planta inválido' }
  }

  const result = await deletePlanta(id, session.accessToken)

  if (!result.ok) {
    if (result.reason === 'not_found') {
      return { error: 'Planta no encontrada' }
    }
    if (result.reason === 'has_tablets') {
      return { error: 'No se puede eliminar: la planta tiene tablets asignadas.' }
    }
    return { error: 'Error inesperado al eliminar la planta' }
  }

  revalidatePath('/admin/plantas')
  return { ok: true }
}
