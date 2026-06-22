'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { createClientUser as serviceCreateClientUser } from '@/back/services/clientService'

export type CreateClientUserState = {
  errors?: {
    nombreCompleto?: string[]
    codigoEmpleado?: string[]
    correo?: string[]
    contrasena?: string[]
    general?: string[]
  }
  success?: true
} | undefined

const Schema = z.object({
  clienteId:      z.coerce.number().int().positive(),
  nombreCompleto: z.string().min(1, 'El nombre es requerido').trim(),
  codigoEmpleado: z.string().min(1, 'El código es requerido').trim(),
  correo:         z.string().email('Correo inválido').trim(),
  contrasena:     z.string().min(8, 'Mínimo 8 caracteres'),
})

export async function createClientUser(
  _state: CreateClientUserState,
  formData: FormData,
): Promise<CreateClientUserState> {
  const session = await getSession()
  if (!session || !can(session, 'usuarios.crear_cliente')) {
    return { errors: { general: ['No autorizado'] } }
  }

  const raw = {
    clienteId:      formData.get('clienteId'),
    nombreCompleto: String(formData.get('nombreCompleto') ?? '').trim(),
    codigoEmpleado: String(formData.get('codigoEmpleado') ?? '').trim(),
    correo:         String(formData.get('correo') ?? '').trim(),
    contrasena:     String(formData.get('contrasena') ?? ''),
  }

  const validated = Schema.safeParse(raw)
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const result = await serviceCreateClientUser(
    {
      clienteId:      validated.data.clienteId,
      nombreCompleto: validated.data.nombreCompleto,
      codigoEmpleado: validated.data.codigoEmpleado,
      correo:         validated.data.correo,
      contrasena:     validated.data.contrasena,
    },
    session.accessToken,
  )

  if (!result.ok) {
    if (result.reason === 'not_found') {
      return { errors: { general: ['El cliente no existe'] } }
    }
    if (result.reason === 'duplicate') {
      const msg = result.message?.toLowerCase() ?? ''
      if (msg.includes('correo') || msg.includes('email')) {
        return { errors: { correo: ['Este correo ya está registrado'] } }
      }
      if (msg.includes('codigo') || msg.includes('código')) {
        return { errors: { codigoEmpleado: ['Este código de empleado ya está en uso'] } }
      }
      return { errors: { general: [result.message ?? 'Dato duplicado'] } }
    }
    if (result.reason === 'validation') {
      return { errors: { general: [result.message ?? 'Error de validación'] } }
    }
    return { errors: { general: ['Error inesperado al crear el usuario'] } }
  }

  revalidatePath('/admin/clientes')
  return { success: true }
}
