'use server'

import { z } from 'zod'
import type { PlantaRow } from '@/shared/types/planta'
import { getSession } from '@/back/services/session'
import { createPlanta as serviceCreatePlanta } from '@/back/services/plantService'

export type CreatePlantaState = {
  errors?: {
    nombre?: string[]
    direccion?: string[]
    general?: string[]
  }
  success?: true
  planta?: PlantaRow
} | undefined

const CreatePlantaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').trim(),
  direccion: z.string().trim().optional(),
})

export async function createPlanta(
  state: CreatePlantaState,
  formData: FormData,
): Promise<CreatePlantaState> {
  const session = await getSession()
  if (!session || session.rol !== 'admin') {
    return { errors: { general: ['No autorizado'] } }
  }

  const raw = {
    nombre: String(formData.get('nombre') ?? '').trim(),
    direccion: String(formData.get('direccion') ?? '').trim() || undefined,
  }

  const validated = CreatePlantaSchema.safeParse(raw)
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  try {
    const result = await serviceCreatePlanta({
      nombre: validated.data.nombre,
      direccion: validated.data.direccion,
    })

    return { success: true, planta: result.planta }
  } catch {
    return { errors: { general: ['Error inesperado al crear la planta'] } }
  }
}
