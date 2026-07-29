'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/back/services/session'
import { resetInspectorPassword } from '@/back/services/inspectorService'

// No existe un permiso fino para este módulo — se gatea directamente por rol.
const ALLOWED_ROLES = new Set(['superusuario', 'supervisor_regional', 'supervisor', 'lider'])

export type ResetInspectorPasswordState =
  | { ok: true; generatedPassword: string }
  | { ok: false; error: string }
  | undefined

export async function resetInspectorPasswordAction(
  _state: ResetInspectorPasswordState,
  formData: FormData,
): Promise<ResetInspectorPasswordState> {
  const session = await getSession()
  if (!session) {
    return { ok: false, error: 'Sesión expirada. Por favor inicia sesión nuevamente.' }
  }
  if (!ALLOWED_ROLES.has(session.rol)) {
    return { ok: false, error: 'No autorizado.' }
  }

  const empleadoId = Number(formData.get('empleadoId') ?? '')
  if (!Number.isFinite(empleadoId) || empleadoId <= 0) {
    return { ok: false, error: 'Datos incompletos.' }
  }

  try {
    const result = await resetInspectorPassword(empleadoId, session.accessToken)

    if (!result.ok) {
      return { ok: false, error: result.error }
    }

    revalidatePath('/supervisor/inspectores')
    revalidatePath('/superusuario/inspectores')

    return { ok: true, generatedPassword: result.generatedPassword }
  } catch {
    return { ok: false, error: 'Error inesperado al resetear la contraseña.' }
  }
}
