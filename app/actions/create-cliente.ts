'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ClienteRow } from '@/shared/types/cliente'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { createCliente as serviceCreateCliente } from '@/back/services/clientService'

export type CreateClienteState = {
  errors?: {
    nombre?: string[]
    rfc?: string[]
    direccion?: string[]
    razonSocial?: string[]
    general?: string[]
  }
  success?: true
  cliente?: ClienteRow
} | undefined

const CreateClienteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').trim(),
  rfc: z.string().min(1, 'El RFC es requerido').trim(),
  direccion: z.string().min(1, 'La dirección es requerida').trim(),
  razonSocial: z.string().trim().optional(),
})

export async function createCliente(
  _state: CreateClienteState,
  formData: FormData,
): Promise<CreateClienteState> {
  const session = await getSession()
  if (!session || !can(session, 'clientes.crud')) {
    return { errors: { general: ['No autorizado'] } }
  }

  const raw = {
    nombre: String(formData.get('nombre') ?? '').trim(),
    rfc: String(formData.get('rfc') ?? '').trim(),
    direccion: String(formData.get('direccion') ?? '').trim(),
    razonSocial: String(formData.get('razonSocial') ?? '').trim() || undefined,
  }
  const po = formData.get('po') === 'on'

  const validated = CreateClienteSchema.safeParse(raw)
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const result = await serviceCreateCliente(
    {
      nombre: validated.data.nombre,
      rfc: validated.data.rfc,
      direccion: validated.data.direccion,
      razonSocial: validated.data.razonSocial,
      po,
    },
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
