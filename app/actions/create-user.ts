'use server'

import { z } from 'zod'
import { Prisma } from '@prisma/client'
import type { UsuarioRow } from '@/shared/types/usuario'
import { getSession } from '@/back/services/session'
import { createUsuario } from '@/back/services/userService'

export type CreateUserState = {
  errors?: {
    nombreCompleto?: string[]
    codigoEmpleado?: string[]
    puesto?: string[]
    planta?: string[]
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
    planta: z.string().min(1, 'La planta es requerida').trim(),
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

  const raw = {
    nombreCompleto: String(formData.get('nombreCompleto') ?? '').trim(),
    codigoEmpleado: String(formData.get('codigoEmpleado') ?? '').trim(),
    puesto: String(formData.get('puesto') ?? '').trim(),
    planta: String(formData.get('planta') ?? '').trim(),
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
    const result = await createUsuario(serviceInput)

    if (!result.ok) {
      if (result.reason === 'duplicate_codigo') {
        return { errors: { codigoEmpleado: ['Este código ya está registrado'] } }
      }
      return { errors: { correo: ['Este correo ya está registrado'] } }
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
    return { errors: { general: ['Error inesperado al crear el usuario'] } }
  }
}
