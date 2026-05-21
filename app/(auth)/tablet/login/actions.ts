'use server'

import { redirect } from 'next/navigation'
import { TabletLoginSchema } from '@/shared/schemas/auth'
import { loginUsuario } from '@/back/services/authService'
import { createSession } from '@/back/services/session'

export type LoginState = {
  errors?: {
    identifier?: string[]
    password?: string[]
    general?: string[]
  }
} | undefined

const ERROR_MESSAGES: Record<string, string> = {
  not_found: 'Credenciales incorrectas.',
  wrong_password: 'Credenciales incorrectas.',
  locked: 'Cuenta bloqueada temporalmente. Intenta en 15 minutos.',
  inactive: 'Tu cuenta está desactivada. Contacta al administrador.',
}

export async function loginTabletUser(
  state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const raw = {
    identifier: formData.get('identifier') as string,
    password: formData.get('password') as string,
  }

  const validated = TabletLoginSchema.safeParse(raw)
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const result = await loginUsuario(validated.data.identifier, validated.data.password)

  if (!result.ok) {
    return { errors: { general: [ERROR_MESSAGES[result.reason] ?? 'Error al iniciar sesión.'] } }
  }

  await createSession({
    userId: result.userId,
    rol: result.rol,
    codigoEmpleado: result.codigoEmpleado,
    nombreCompleto: result.nombreCompleto,
  })

  redirect(result.rol === 'supervisor' ? '/supervisor' : '/capturacion')
}
