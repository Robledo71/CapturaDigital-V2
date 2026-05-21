'use server'

import { z } from 'zod'
import { Prisma } from '@prisma/client'
import type { UsuarioRow } from '@/shared/types/usuario'
import { getSession } from '@/back/services/session'
import { updateUsuario } from '@/back/services/userService'

export type UpdateUserState = {
  errors?: {
    nombreCompleto?: string[]
    codigoEmpleado?: string[]
    puesto?: string[]
    planta?: string[]
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
  planta: z.string().min(1, 'La planta es requerida').trim(),
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

  const id = String(formData.get('id') ?? '').trim()
  if (!id) {
    return { errors: { general: ['ID de usuario requerido'] } }
  }

  const raw = {
    nombreCompleto: String(formData.get('nombreCompleto') ?? '').trim(),
    codigoEmpleado: String(formData.get('codigoEmpleado') ?? '').trim(),
    puesto: String(formData.get('puesto') ?? '').trim(),
    planta: String(formData.get('planta') ?? '').trim(),
    rol: String(formData.get('rol') ?? '').trim(),
    correo: String(formData.get('correo') ?? '').trim(),
  }

  const validated = UpdateUserSchema.safeParse(raw)
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  try {
    const result = await updateUsuario({ id, ...validated.data })

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
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      const target = err.meta?.target as string[] | undefined
      if (target?.includes('codigo_empleado')) {
        return { errors: { codigoEmpleado: ['Este código ya está registrado'] } }
      }
      if (target?.includes('correo')) {
        return { errors: { correo: ['Este correo ya está registrado'] } }
      }
      return { errors: { general: ['Ya existe un usuario con esos datos'] } }
    }
    return { errors: { general: ['Error inesperado al actualizar el usuario'] } }
  }
}
