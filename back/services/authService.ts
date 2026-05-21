import 'server-only'
import bcrypt from 'bcryptjs'
import {
  findByCodigoEmpleado,
  incrementFailedAttempts,
  lockAccount,
  resetFailedAttempts,
} from '@/back/repositories/userRepository'

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15

export type LoginResult =
  | { ok: true; userId: string; rol: 'admin' | 'supervisor' | 'capturacion' | 'lider'; codigoEmpleado: string; nombreCompleto: string }
  | { ok: false; reason: 'not_found' | 'wrong_password' | 'locked' | 'inactive' }

export async function loginUsuario(
  codigoEmpleado: string,
  password: string,
): Promise<LoginResult> {
  const user = await findByCodigoEmpleado(codigoEmpleado)
  if (!user) return { ok: false, reason: 'not_found' }

  if (!user.isActive) return { ok: false, reason: 'inactive' }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { ok: false, reason: 'locked' }
  }

  const match = await bcrypt.compare(password, user.contrasena)
  if (!match) {
    const newAttempts = user.failedLoginAttempts + 1
    if (newAttempts >= MAX_ATTEMPTS) {
      await lockAccount(user.id, new Date(Date.now() + LOCK_MINUTES * 60 * 1000))
    } else {
      await incrementFailedAttempts(user.id)
    }
    return { ok: false, reason: 'wrong_password' }
  }

  await resetFailedAttempts(user.id)

  return {
    ok: true,
    userId: user.id,
    rol: user.rol as 'admin' | 'supervisor' | 'capturacion' | 'lider',
    codigoEmpleado: user.codigoEmpleado,
    nombreCompleto: user.nombreCompleto,
  }
}
