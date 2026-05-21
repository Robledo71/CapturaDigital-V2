'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { loginUsuario } from '@/back/services/authService'
import { createSession } from '@/back/services/session'

const Schema = z.object({
  employee_number: z.string().min(1, 'El número de empleado es requerido').trim(),
  password: z.string().min(1, 'La contraseña es requerida'),
})

export type LoginState = {
  errors?: {
    employee_number?: string[]
    password?: string[]
    general?: string[]
  }
  employee_number?: string
} | undefined

export type ForgotState = {
  errors?: { email?: string[] }
  success?: boolean
} | undefined

const ERROR_MESSAGES: Record<string, string> = {
  not_found: 'Credenciales incorrectas.',
  wrong_password: 'Credenciales incorrectas.',
  locked: 'Cuenta bloqueada temporalmente. Intenta en 15 minutos.',
  inactive: 'Tu cuenta está desactivada. Contacta al administrador.',
}

export async function loginSupervisor(
  state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const raw = {
    employee_number: formData.get('employee_number') as string,
    password: formData.get('password') as string,
  }

  const validated = Schema.safeParse(raw)
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, employee_number: raw.employee_number }
  }

  const result = await loginUsuario(validated.data.employee_number, validated.data.password)

  if (!result.ok) {
    return { errors: { general: [ERROR_MESSAGES[result.reason] ?? 'Error al iniciar sesión.'] }, employee_number: validated.data.employee_number }
  }

  await createSession({ userId: result.userId, rol: result.rol, codigoEmpleado: result.codigoEmpleado, nombreCompleto: result.nombreCompleto })

  redirect(result.rol === 'supervisor' ? '/supervisor' : '/capturacion')
}

export async function requestPasswordReset(
  state: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const email = (formData.get('email') as string)?.trim()
  if (!email || !email.includes('@')) {
    return { errors: { email: ['Ingresa un correo válido'] } }
  }
  // TODO: enviar correo real con Resend en Sprint 3
  return { success: true }
}
