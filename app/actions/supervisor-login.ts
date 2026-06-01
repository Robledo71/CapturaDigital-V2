'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createSession } from '@/back/services/session'
import { requestPasswordReset as sendResetEmail } from '@/back/services/passwordResetService'

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

  let rol: string
  let userId: number
  let codigoEmpleado: string
  let nombreCompleto: string
  let plantaId: number | null
  let plantaNombre: string | null
  let accessToken: string
  let refreshToken: string

  try {
    const res = await fetch(`${process.env.QSYNC_API_URL}/qb_sync/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Token': process.env.X_APP_TOKEN ?? '',
      },
      body: JSON.stringify({
        codigoEmpleado: validated.data.employee_number,
        contrasena: validated.data.password,
      }),
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok || body.success === false) {
      const reason = body?.reason ?? 'general'
      return {
        errors: { general: [ERROR_MESSAGES[reason] ?? 'Credenciales incorrectas.'] },
        employee_number: validated.data.employee_number,
      }
    }

    rol = body.data.user.rol
    userId = Number(body.data.user.id)
    codigoEmpleado = validated.data.employee_number
    nombreCompleto = body.data.user.nombreCompleto ?? ''
    plantaId = body.data.user.plantaId ?? null
    plantaNombre = body.data.user.plantaNombre ?? null
    accessToken = body.data.accessToken
    refreshToken = body.data.refreshToken
  } catch {
    return {
      errors: { general: ['No se pudo conectar con el servidor. Intenta nuevamente.'] },
      employee_number: validated.data.employee_number,
    }
  }

  const validRoles = ['admin', 'supervisor', 'capturacion', 'lider', 'cliente'] as const
  type ValidRol = typeof validRoles[number]
  if (!validRoles.includes(rol as ValidRol)) {
    return {
      errors: { general: ['Rol de usuario no soportado. Contacta al administrador.'] },
      employee_number: validated.data.employee_number,
    }
  }

  await createSession({
    userId,
    rol: rol as ValidRol,
    codigoEmpleado,
    nombreCompleto,
    plantaId,
    plantaNombre,
    accessToken,
    refreshToken,
  })

  const redirectByRol: Record<ValidRol, string> = {
    supervisor:  '/supervisor',
    lider:       '/supervisor',
    admin:       '/admin',
    capturacion: '/capturacion',
    cliente:     '/cliente',
  }
  redirect(redirectByRol[rol as ValidRol])
}

export async function requestPasswordReset(
  state: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const email = (formData.get('email') as string)?.trim()
  if (!email || !email.includes('@')) {
    return { errors: { email: ['Ingresa un correo válido'] } }
  }
  await sendResetEmail(email)
  return { success: true }
}
