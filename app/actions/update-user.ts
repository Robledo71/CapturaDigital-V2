'use server'

import { z } from 'zod'
import type { UsuarioRow } from '@/shared/types/usuario'
import { getSession } from '@/back/services/session'
import { updateUsuario } from '@/back/services/userService'

export type UpdateUserState = {
  errors?: {
    nombreCompleto?: string[]
    codigoEmpleado?: string[]
    puesto?: string[]
    plantaId?: string[]
    rol?: string[]
    correo?: string[]
    general?: string[]
  }
  success?: true
  usuario?: UsuarioRow
} | undefined

const UpdateUserSchema = z.object({
  nombreCompleto: z.string().min(1, 'El nombre completo es requerido').trim(),
  codigoEmpleado: z.string().min(1, 'El código de empleado es requerido').trim(),
  puesto: z.string().min(1, 'El puesto es requerido').trim(),
  plantaId: z.coerce
    .number({ error: 'Selecciona una planta' })
    .int()
    .positive('Selecciona una planta'),
  rol: z.enum(['admin', 'supervisor', 'capturacion', 'lider'], {
    error: 'Rol no válido',
  }),
  correo: z.string().email('El correo no es válido').trim(),
})

export async function updateUser(
  state: UpdateUserState,
  formData: FormData,
): Promise<UpdateUserState> {
  const session = await getSession()
  if (!session || session.rol !== 'admin') {
    return { errors: { general: ['No autorizado'] } }
  }
  const accessToken = session.accessToken

  const idRaw = parseInt(String(formData.get('id') ?? '').trim(), 10)
  if (isNaN(idRaw) || idRaw <= 0) {
    return { errors: { general: ['ID de usuario requerido'] } }
  }
  const id = idRaw

  const plantaIdRaw = parseInt(String(formData.get('plantaId') ?? ''), 10)

  const raw = {
    nombreCompleto: String(formData.get('nombreCompleto') ?? '').trim(),
    codigoEmpleado: String(formData.get('codigoEmpleado') ?? '').trim(),
    puesto: String(formData.get('puesto') ?? '').trim(),
    plantaId: isNaN(plantaIdRaw) ? '' : plantaIdRaw,
    rol: String(formData.get('rol') ?? '').trim(),
    correo: String(formData.get('correo') ?? '').trim(),
  }

  const validated = UpdateUserSchema.safeParse(raw)
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  try {
    const result = await updateUsuario({ id, ...validated.data }, accessToken)

    if (!result.ok) {
      if (result.reason === 'duplicate_codigo') {
        return { errors: { codigoEmpleado: ['Este código ya está registrado'] } }
      }
      if (result.reason === 'duplicate_correo') {
        return { errors: { correo: ['Este correo ya está registrado'] } }
      }
      // not_found
      return { errors: { general: ['Usuario no encontrado'] } }
    }

    return { success: true, usuario: result.usuario }
  } catch {
    return { errors: { general: ['Error inesperado al actualizar el usuario'] } }
  }
}
