'use server'

import { redirect } from 'next/navigation'
import { TabletLoginSchema } from '@/shared/schemas/auth'
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

  let rol: string
  let userId: number
  let codigoEmpleado: string
  let nombreCompleto: string
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
        codigoEmpleado: validated.data.identifier,
        contrasena: validated.data.password,
      }),
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok || body.success === false) {
      const reason = body?.reason ?? 'general'
      return { errors: { general: [ERROR_MESSAGES[reason] ?? 'Credenciales incorrectas.'] } }
    }

    rol = body.data.user.rol
    userId = Number(body.data.user.id)
    codigoEmpleado = validated.data.identifier
    nombreCompleto = body.data.user.nombreCompleto ?? ''
    accessToken = body.data.accessToken
    refreshToken = body.data.refreshToken
  } catch {
    return { errors: { general: ['No se pudo conectar con el servidor. Intenta nuevamente.'] } }
  }

  await createSession({
    userId,
    rol: rol as 'admin' | 'supervisor' | 'capturacion' | 'lider',
    codigoEmpleado,
    nombreCompleto,
    accessToken,
    refreshToken,
  })

  redirect(rol === 'supervisor' || rol === 'lider' ? '/supervisor' : rol === 'admin' ? '/admin' : '/capturacion')
}
