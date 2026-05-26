'use server'

import { z } from 'zod'
import type { UsuarioRow } from '@/shared/types/usuario'
import { getSession } from '@/back/services/session'
import { createUsuario } from '@/back/services/userService'

export type CreateUserState = {
  errors?: {
    nombreCompleto?: string[]
    codigoEmpleado?: string[]
    puesto?: string[]
    plantaId?: string[]
    rol?: string[]
    correo?: string[]
    contrasena?: string[]
    confirmContrasena?: string[]
    general?: string[]
  }
  success?: true
  usuario?: UsuarioRow
} | undefined

const CreateUserSchema = z
  .object({
    nombreCompleto: z.string().min(1, 'El nombre completo es requerido').trim(),
    codigoEmpleado: z.string().min(1, 'El código de empleado es requerido').trim(),
    puesto: z.string().min(1, 'El puesto es requerido').trim(),
    plantaId: z.coerce
      .number({ error: 'Selecciona una planta' })
      .int()
      .positive('Selecciona una planta'),
    rol: z.enum(['supervisor', 'capturacion', 'admin', 'lider'], {
      error: 'Rol no válido',
    }),
    correo: z.string().email('El correo no es válido').trim(),
    contrasena: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmContrasena: z.string().min(1, 'Confirma la contraseña'),
  })
  .refine((data) => data.contrasena === data.confirmContrasena, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmContrasena'],
  })

export async function createUser(
  state: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const session = await getSession()
  if (!session || session.rol !== 'admin') {
    return { errors: { general: ['No autorizado'] } }
  }
  const accessToken = session.accessToken

  const plantaIdRaw = parseInt(String(formData.get('plantaId') ?? ''), 10)

  const raw = {
    nombreCompleto: String(formData.get('nombreCompleto') ?? '').trim(),
    codigoEmpleado: String(formData.get('codigoEmpleado') ?? '').trim(),
    puesto: String(formData.get('puesto') ?? '').trim(),
    plantaId: isNaN(plantaIdRaw) ? '' : plantaIdRaw,
    rol: String(formData.get('rol') ?? '').trim(),
    correo: String(formData.get('correo') ?? '').trim(),
    contrasena: String(formData.get('contrasena') ?? ''),
    confirmContrasena: String(formData.get('confirmContrasena') ?? ''),
  }

  const validated = CreateUserSchema.safeParse(raw)
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { confirmContrasena: _, ...serviceInput } = validated.data

  try {
    const result = await createUsuario(serviceInput, accessToken)

    if (!result.ok) {
      if (result.reason === 'duplicate_codigo') {
        return { errors: { codigoEmpleado: ['Este código ya está registrado'] } }
      }
      return { errors: { correo: ['Este correo ya está registrado'] } }
    }

    return { success: true, usuario: result.usuario }
  } catch {
    return { errors: { general: ['Error inesperado al crear el usuario'] } }
  }
}
