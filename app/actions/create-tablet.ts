'use server'

import { z } from 'zod'
import type { TabletRow } from '@/shared/types/tablet'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { createTablet as serviceCreateTablet } from '@/back/services/tabletService'

export type CreateTabletState = {
  errors?: {
    modelo?: string[]
    serie?: string[]
    codigotablet?: string[]
    alias?: string[]
    plantaId?: string[]
    notes?: string[]
    general?: string[]
  }
  success?: true
  tablet?: TabletRow
} | undefined

const CreateTabletSchema = z.object({
  modelo: z.string().min(1, 'El modelo es requerido').trim(),
  serie: z.string().min(1, 'El número de serie es requerido').trim(),
  codigotablet: z.string().trim().optional(),
  alias: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

export async function createTablet(
  state: CreateTabletState,
  formData: FormData,
): Promise<CreateTabletState> {
  const session = await getSession()
  if (!session || !can(session, 'tablets.gestionar')) {
    return { errors: { general: ['No autorizado'] } }
  }
  const accessToken = session.accessToken

  const plantaIdRaw = String(formData.get('plantaId') ?? '').trim()
  const plantaId = plantaIdRaw !== '' ? parseInt(plantaIdRaw, 10) : undefined

  if (plantaIdRaw !== '' && isNaN(plantaId as number)) {
    return { errors: { plantaId: ['ID de planta inválido'] } }
  }

  const raw = {
    modelo: String(formData.get('modelo') ?? '').trim(),
    serie: String(formData.get('serie') ?? '').trim(),
    codigotablet: String(formData.get('codigotablet') ?? '').trim() || undefined,
    alias: String(formData.get('alias') ?? '').trim() || undefined,
    notes: String(formData.get('notes') ?? '').trim() || undefined,
  }

  const validated = CreateTabletSchema.safeParse(raw)
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  try {
    const result = await serviceCreateTablet(
      {
        modelo: validated.data.modelo,
        serie: validated.data.serie,
        codigotablet: validated.data.codigotablet,
        alias: validated.data.alias,
        plantaId,
        notes: validated.data.notes,
      },
      accessToken,
    )

    if (!result.ok) {
      if (result.reason === 'duplicate_codigo') {
        return { errors: { codigotablet: ['Este código ya está en uso por otra tablet'] } }
      }
      return { errors: { serie: ['Este número de serie ya está registrado'] } }
    }

    return { success: true, tablet: result.tablet }
  } catch {
    return { errors: { general: ['Error inesperado al crear la tablet'] } }
  }
}
