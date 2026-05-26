'use server'

import { z } from 'zod'
import type { TabletRow } from '@/shared/types/tablet'
import { getSession } from '@/back/services/session'
import { updateTablet as serviceUpdateTablet } from '@/back/services/tabletService'

export type UpdateTabletState = {
  errors?: {
    modelo?: string[]
    serie?: string[]
    codigotablet?: string[]
    alias?: string[]
    plantaId?: string[]
    notes?: string[]
    estado?: string[]
    general?: string[]
  }
  success?: true
  tablet?: TabletRow
} | undefined

const UpdateTabletSchema = z.object({
  modelo: z.string().min(1, 'El modelo es requerido').trim(),
  serie: z.string().min(1, 'El número de serie es requerido').trim(),
  codigotablet: z.string().min(1, 'El código de tablet es requerido').trim().optional(),
  alias: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  estado: z
    .enum(['activa', 'inactiva', 'mantenimiento'], {
      error: 'Estado no válido',
    })
    .optional(),
})

export async function updateTablet(
  state: UpdateTabletState,
  formData: FormData,
): Promise<UpdateTabletState> {
  const session = await getSession()
  if (!session || session.rol !== 'admin') {
    return { errors: { general: ['No autorizado'] } }
  }
  const accessToken = session.accessToken

  const id = parseInt(String(formData.get('id') ?? ''), 10)
  if (isNaN(id)) {
    return { errors: { general: ['ID de tablet inválido'] } }
  }

  const plantaIdRaw = String(formData.get('plantaId') ?? '').trim()
  const plantaId =
    plantaIdRaw !== '' ? parseInt(plantaIdRaw, 10) : undefined

  if (plantaIdRaw !== '' && isNaN(plantaId as number)) {
    return { errors: { plantaId: ['ID de planta inválido'] } }
  }

  const aliasRaw = String(formData.get('alias') ?? '').trim()
  const notesRaw = String(formData.get('notes') ?? '').trim()
  const estadoRaw = String(formData.get('estado') ?? '').trim()
  const codigotabletRaw = String(formData.get('codigotablet') ?? '').trim()

  const raw = {
    modelo: String(formData.get('modelo') ?? '').trim(),
    serie: String(formData.get('serie') ?? '').trim(),
    codigotablet: codigotabletRaw || undefined,
    alias: aliasRaw || undefined,
    notes: notesRaw || undefined,
    estado: estadoRaw || undefined,
  }

  const validated = UpdateTabletSchema.safeParse(raw)
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  try {
    const result = await serviceUpdateTablet(
      {
        id,
        modelo: validated.data.modelo,
        serie: validated.data.serie,
        codigotablet: validated.data.codigotablet,
        alias: aliasRaw === '' ? null : validated.data.alias,
        plantaId: plantaIdRaw === '' ? null : plantaId,
        notes: notesRaw === '' ? null : validated.data.notes,
        estado: validated.data.estado,
      },
      accessToken,
    )

    if (!result.ok) {
      if (result.reason === 'duplicate_serie') {
        return { errors: { serie: ['Este número de serie ya está registrado'] } }
      }
      if (result.reason === 'duplicate_codigo') {
        return { errors: { codigotablet: ['Este código ya está en uso por otra tablet'] } }
      }
      return { errors: { general: ['Tablet no encontrada'] } }
    }

    return { success: true, tablet: result.tablet }
  } catch {
    return { errors: { general: ['Error inesperado al actualizar la tablet'] } }
  }
}
