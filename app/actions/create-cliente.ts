'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ClienteRow } from '@/shared/types/cliente'
import { getSession } from '@/back/services/session'
import { createCliente as serviceCreateCliente } from '@/back/services/clientService'

export type CreateClienteState = {
  errors?: {
    nombre?: string[]
    general?: string[]
  }
  success?: true
  cliente?: ClienteRow
} | undefined

const CreateClienteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').trim(),
})

export async function createCliente(
  _state: CreateClienteState,
  formData: FormData,
): Promise<CreateClienteState> {
  const session = await getSession()
  if (!session || session.rol !== 'admin') {
    return { errors: { general: ['No autorizado'] } }
  }

  const raw = {
    nombre: String(formData.get('nombre') ?? '').trim(),
  }

  const validated = CreateClienteSchema.safeParse(raw)
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const result = await serviceCreateCliente(
    { nombre: validated.data.nombre },
    session.accessToken,
  )

  if (!result.ok) {
    if (result.reason === 'duplicate_name') {
      return { errors: { nombre: ['Ya existe un cliente con ese nombre'] } }
    }
    return { errors: { general: ['Error inesperado al crear el cliente'] } }
  }

  revalidatePath('/admin/clientes')
  return { success: true, cliente: result.cliente }
}
