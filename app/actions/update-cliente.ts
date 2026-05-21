'use server'

import { z } from 'zod'
import type { ClienteRow } from '@/shared/types/cliente'
import { getSession } from '@/back/services/session'
import { updateCliente as serviceUpdateCliente } from '@/back/services/clientService'

export type UpdateClienteState = {
  errors?: {
    nombre?: string[]
    direccion?: string[]
    general?: string[]
  }
  success?: true
  cliente?: ClienteRow
} | undefined

const UpdateClienteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').trim(),
  direccion: z.string().trim().optional(),
  requiereOC: z.boolean(),
})

export async function updateCliente(
  state: UpdateClienteState,
  formData: FormData,
): Promise<UpdateClienteState> {
  const session = await getSession()
  if (!session || session.rol !== 'admin') {
    return { errors: { general: ['No autorizado'] } }
  }

  const id = parseInt(String(formData.get('id') ?? ''), 10)
  if (isNaN(id)) {
    return { errors: { general: ['ID de cliente inválido'] } }
  }

  const ocRaw = String(formData.get('requiereOC') ?? '')
  const requiereOC = ocRaw === 'on' || ocRaw === 'true'

  const direccionRaw = String(formData.get('direccion') ?? '').trim()

  const raw = {
    nombre: String(formData.get('nombre') ?? '').trim(),
    direccion: direccionRaw || undefined,
    requiereOC,
  }

  const validated = UpdateClienteSchema.safeParse(raw)
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  try {
    const result = await serviceUpdateCliente({
      id,
      nombre: validated.data.nombre,
      direccion: direccionRaw === '' ? null : validated.data.direccion,
      requiereOC: validated.data.requiereOC,
    })

    if (!result.ok) {
      return { errors: { general: ['Cliente no encontrado'] } }
    }

    return { success: true, cliente: result.cliente }
  } catch {
    return { errors: { general: ['Error inesperado al actualizar el cliente'] } }
  }
}
