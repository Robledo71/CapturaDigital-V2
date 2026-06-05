import 'server-only'

// Recuperación de contraseña — toda la lógica (token, BD, email) vive en qb_sync.
// Este servicio solo orquesta las llamadas HTTP a la API interna.

function baseUrl(): string {
  return (process.env.QSYNC_API_URL ?? '').replace(/\/$/, '')
}

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-App-Token': process.env.X_APP_TOKEN ?? '',
  }
}

/**
 * Solicita el envío del correo de recuperación.
 * Silencioso por diseño: nunca revela si el correo existe.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await fetch(`${baseUrl()}/qb_sync/auth/password-reset/request`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ correo: email }),
      cache: 'no-store',
    })
  } catch {
    // Silencioso — no exponemos errores de red en este flujo.
  }
}

export type ResetPasswordResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_token' | 'expired_token' | 'same_password' }

/**
 * Confirma el cambio de contraseña usando el token del enlace del correo.
 */
export async function resetPassword(rawToken: string, newPassword: string): Promise<ResetPasswordResult> {
  let res: Response
  try {
    res = await fetch(`${baseUrl()}/qb_sync/auth/password-reset/confirm`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ token: rawToken, newPassword }),
      cache: 'no-store',
    })
  } catch {
    return { ok: false, reason: 'invalid_token' }
  }

  if (!res.ok) {
    return { ok: false, reason: 'invalid_token' }
  }

  const body = await res.json().catch(() => null)
  const result = body?.result
  if (result?.ok === true) return { ok: true }

  const reason = result?.reason
  if (reason === 'expired_token' || reason === 'same_password') {
    return { ok: false, reason }
  }
  return { ok: false, reason: 'invalid_token' }
}
