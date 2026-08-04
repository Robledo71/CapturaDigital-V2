'use server'

import { z } from 'zod'
import type { UsuarioRow } from '@/shared/types/usuario'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { createUsuario } from '@/back/services/userService'

export type CreateUserState = {
  errors?: {
    nombreEmpleado?: string[]
    apellidoPaterno?: string[]
    apellidoMaterno?: string[]
    codigoEmpleado?: string[]
    plantaIds?: string[]
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
    nombreEmpleado: z.string().min(1, 'El nombre es requerido').trim(),
    apellidoPaterno: z.string().min(1, 'El apellido paterno es requerido').trim(),
    // Apellido materno opcional: si se deja vacío, la BD asigna 'X' por defecto.
    apellidoMaterno: z.string().trim().optional(),
    codigoEmpleado: z.string().min(1, 'El código de empleado es requerido').trim(),
    // Optativo: algunos roles (p. ej. cross-planta) pueden no tener planta asignada.
    plantaIds: z.array(z.number().int().positive()),
    rol: z.enum(
      [
        'superusuario',
        'admin',
        'gerente',
        'supervisor_regional',
        'supervisor',
        'lider',
        'servicio_cliente',
        'capturacion',
        'inspector',
      ],
      { error: 'Rol no válido' },
    ),
    // Correo opcional: puede ir vacío. Si trae algo, debe ser un email válido.
    correo: z.string().trim().email('El correo no es válido').or(z.literal('')),
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
  if (!session || !can(session, 'usuarios.crud')) {
    return { errors: { general: ['No autorizado'] } }
  }
  const accessToken = session.accessToken

  const plantaIds = formData
    .getAll('plantaIds')
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0)

  const apellidoMaternoRaw = String(formData.get('apellidoMaterno') ?? '').trim()

  const raw = {
    nombreEmpleado: String(formData.get('nombreEmpleado') ?? '').trim(),
    apellidoPaterno: String(formData.get('apellidoPaterno') ?? '').trim(),
    // Vacío → undefined para que quede opcional (la BD pone 'X').
    apellidoMaterno: apellidoMaternoRaw || undefined,
    codigoEmpleado: String(formData.get('codigoEmpleado') ?? '').trim(),
    plantaIds,
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
