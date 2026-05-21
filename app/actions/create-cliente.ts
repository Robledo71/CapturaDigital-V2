'use server'

import { z } from 'zod'
import type { ClienteRow } from '@/shared/types/cliente'
import { getSession } from '@/back/services/session'
import { createCliente as serviceCreateCliente } from '@/back/services/clientService'

export type CreateClienteState = {
  errors?: {
    nombre?: string[]
    direccion?: string[]
    general?: string[]
  }
  success?: true
  cliente?: ClienteRow
} | undefined

const CreateClienteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').trim(),
  direccion: z.string().trim().optional(),
  requiereOC: z.boolean(),
})

export async function createCliente(
  state: CreateClienteState,
  formData: FormData,
): Promise<CreateClienteState> {
  const session = await getSession()
  if (!session || session.rol !== 'admin') {
    return { errors: { general: ['No autorizado'] } }
  }

  const ocRaw = String(formData.get('requiereOC') ?? '')
  const requiereOC = ocRaw === 'on' || ocRaw === 'true'

  const raw = {
    nombre: String(formData.get('nombre') ?? '').trim(),
    direccion: String(formData.get('direccion') ?? '').trim() || undefined,
    requiereOC,
  }

  const validated = CreateClienteSchema.safeParse(raw)
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  try {
    const result = await serviceCreateCliente({
      nombre: validated.data.nombre,
      direccion: validated.data.direccion,
      requiereOC: validated.data.requiereOC,
    })

    return { success: true, cliente: result.cliente }
  } catch {
    return { errors: { general: ['Error inesperado al crear el cliente'] } }
  }
}
