'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ClienteRow } from '@/shared/types/cliente'
import { getSession } from '@/back/services/session'
import { updateCliente as serviceUpdateCliente } from '@/back/services/clientService'

export type UpdateClienteState = {
  errors?: {
    nombre?: string[]
    general?: string[]
  }
  success?: true
  cliente?: ClienteRow
} | undefined

const UpdateClienteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').trim(),
})

export async function updateCliente(
  _state: UpdateClienteState,
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

  const raw = {
    nombre: String(formData.get('nombre') ?? '').trim(),
  }

  const validated = UpdateClienteSchema.safeParse(raw)
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const result = await serviceUpdateCliente(
    { id, nombre: validated.data.nombre },
    session.accessToken,
  )

  if (!result.ok) {
    if (result.reason === 'not_found') {
      return { errors: { general: ['Cliente no encontrado'] } }
    }
    return { errors: { general: ['Error inesperado al actualizar el cliente'] } }
  }

  revalidatePath('/admin/clientes')
  return { success: true, cliente: result.cliente }
}
