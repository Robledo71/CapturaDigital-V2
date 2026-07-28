'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createSession, type JWTPayload } from '@/back/services/session'
import { requestPasswordReset as sendResetEmail } from '@/back/services/passwordResetService'

// Portal de aterrizaje por rol (rol llega en minúsculas desde el backend v2.0).
const LANDING_BY_ROL: Record<string, string> = {
  superusuario:     '/superusuario',
  admin:            '/admin',
  supervisor:       '/supervisor',
  lider:            '/supervisor',
  gerente:          '/gerente',
  servicio_cliente: '/servicio-cliente',
  capturacion:      '/capturacion',
}

/** Decodifica el payload de un JWT sin verificar firma (el token viene del backend confiable). */
function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const seg = token.split('.')[1]
    return JSON.parse(Buffer.from(seg, 'base64url').toString('utf8'))
  } catch {
    return {}
  }
}

const Schema = z.object({
  employee_number: z.string().min(1, 'El número de empleado es requerido').trim(),
  password: z.string().min(1, 'La contraseña es requerida'),
})

// Vida de las cookies (coincide con los TTL de los tokens del backend).
const ACCESS_TOKEN_MAX_AGE = 60 * 15            // 15 min
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7  // 7 días

/**
 * Respuesta del login del backend reestructurado. Los tokens vienen en el body
 * (además de las cookies del backend) para que Next pueda re-setearlas hacia el
 * navegador. Se leen ambas convenciones de nombre por robustez (snake/camel).
 */
export type LoginResponse = {
  success: boolean
  data: {
    access_token?: string
    refresh_token?: string
    accessToken?: string
    refreshToken?: string
    tipo: string
    rol: string
    nombre?: string | null
    permisos: string[]
  }
}

export type LoginState = {
  errors?: {
    employee_number?: string[]
    password?: string[]
    general?: string[]
  }
  employee_number?: string
  /** Presente en login exitoso: la respuesta cruda del backend (pantalla temporal). */
  response?: LoginResponse
  /**
   * true cuando la cuenta es de otra app (p.ej. cuentas de mobile: cliente/inspector)
   * y el backend la rechaza con `wrong_app`. El formulario muestra una pantalla de
   * bloqueo dedicada en vez del error inline.
   */
  blocked?: boolean
  /** TEMPORAL: respuesta cruda del backend en errores, para depurar qué se envía. */
  raw?: unknown
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
  wrong_app: 'Esta cuenta no tiene acceso a esta aplicación.',
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

  let body: LoginResponse
  try {
    const res = await fetch(`${process.env.QSYNC_API_URL}/qb_sync/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Token': process.env.X_APP_TOKEN ?? '',
      },
      body: JSON.stringify({
        codigo_usuario: validated.data.employee_number,
        contrasena: validated.data.password,
        origen: 'WEB',
      }),
    })

    const parsed = await res.json().catch(() => ({}))

    if (!res.ok || parsed?.success === false || !parsed?.data) {
      // El reason puede venir en mayúsculas (el backend nuevo usa enums en mayúsculas).
      const reason = String(parsed?.reason ?? 'general').toLowerCase()
      // Preferimos el mensaje mapeado; si el reason es desconocido pero el backend
      // manda su propio `message`, lo mostramos tal cual antes de caer al genérico.
      const message =
        ERROR_MESSAGES[reason] ??
        (typeof parsed?.message === 'string' && parsed.message.trim() ? parsed.message : null) ??
        'Credenciales incorrectas.'
      return {
        errors: { general: [message] },
        employee_number: validated.data.employee_number,
        // Cuenta de otra app (mobile) → pantalla de bloqueo dedicada.
        blocked: reason === 'wrong_app',
        raw: parsed,
      }
    }

    body = parsed as LoginResponse
  } catch {
    return {
      errors: { general: ['No se pudo conectar con el servidor. Intenta nuevamente.'] },
      employee_number: validated.data.employee_number,
    }
  }

  // El fetch al backend corre en el servidor de Next, así que las cookies que el
  // backend manda vía Set-Cookie NO llegan al navegador. Tomamos los tokens del
  // body y seteamos las cookies del lado de Next (mismos nombres/atributos que el
  // backend) para que sí lleguen al browser.
  const accessToken = body.data.access_token ?? body.data.accessToken ?? ''
  const refreshToken = body.data.refresh_token ?? body.data.refreshToken ?? ''
  const cookieStore = await cookies()
  const cookieBase = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  }
  if (accessToken && refreshToken) {
    cookieStore.set('access_token', accessToken, { ...cookieBase, maxAge: ACCESS_TOKEN_MAX_AGE })
    cookieStore.set('refresh_token', refreshToken, { ...cookieBase, maxAge: REFRESH_TOKEN_MAX_AGE })
  }

  // Sesión propia del front (cookie 'session' cifrada) que el proxy y los portales leen.
  // rol llega en minúsculas; permisos en MAYÚSCULAS → se normalizan a minúsculas para
  // que can()/canAny() (catálogo en minúsculas) los reconozca.
  const rol = String(body.data.rol ?? '').toLowerCase()
  const permisos = Array.isArray(body.data.permisos)
    ? body.data.permisos.map((p) => String(p).toLowerCase())
    : undefined
  const tokenPayload = decodeJwtPayload(accessToken)
  const plantaIds = Array.isArray(tokenPayload.plantaIds)
    ? (tokenPayload.plantaIds as number[])
    : []
  const userId = Number(tokenPayload.sub) || 0
  const empleadoId = Number(tokenPayload.empleadoId) || null

  await createSession({
    userId,
    tipo: body.data.tipo === 'cliente' ? 'cliente' : 'empleado',
    rol: rol as JWTPayload['rol'],
    permisos,
    codigoEmpleado: validated.data.employee_number,
    // Nombre para mostrar (sidebar/saludos): nombre + apellido paterno del backend.
    nombreCompleto: String(body.data.nombre ?? '').trim(),
    empleadoId,
    plantaIds,
    plantaId: plantaIds[0] ?? null,
    plantaNombre: null,
    accessToken,
    refreshToken,
  })

  redirect(LANDING_BY_ROL[rol] ?? '/capturacion')
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
