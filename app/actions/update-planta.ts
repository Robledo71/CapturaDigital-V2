'use server'

import { z } from 'zod'
import type { PlantaRow } from '@/shared/types/planta'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { updatePlanta as serviceUpdatePlanta } from '@/back/services/plantService'

export type UpdatePlantaState = {
  errors?: {
    nombre?: string[]
    direccion?: string[]
    general?: string[]
  }
  success?: true
  planta?: PlantaRow
} | undefined

const UpdatePlantaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').trim(),
  direccion: z.string().trim().optional(),
})

export async function updatePlanta(
  state: UpdatePlantaState,
  formData: FormData,
): Promise<UpdatePlantaState> {
  const session = await getSession()
  if (!session || !can(session, 'plantas.crud')) {
    return { errors: { general: ['No autorizado'] } }
  }
  const accessToken = session.accessToken

  const id = parseInt(String(formData.get('id') ?? ''), 10)
  if (isNaN(id)) {
    return { errors: { general: ['ID de planta inválido'] } }
  }

  const direccionRaw = String(formData.get('direccion') ?? '').trim()

  const raw = {
    nombre: String(formData.get('nombre') ?? '').trim(),
    direccion: direccionRaw || undefined,
  }

  const validated = UpdatePlantaSchema.safeParse(raw)
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  try {
    const result = await serviceUpdatePlanta(
      {
        id,
        nombre: validated.data.nombre,
        direccion: direccionRaw === '' ? null : validated.data.direccion,
      },
      accessToken,
    )

    if (!result.ok) {
      return { errors: { general: ['Planta no encontrada'] } }
    }

    return { success: true, planta: result.planta }
  } catch {
    return { errors: { general: ['Error inesperado al actualizar la planta'] } }
  }
}
