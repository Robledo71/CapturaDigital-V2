'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { desasignarInspector } from '@/back/services/inspectionSessionService'

export type DesasignarInspectorState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined

function getNumber(formData: FormData, key: string): number {
  return Number((formData.get(key) as string | null) ?? '')
}

export async function desasignarInspectorAction(
  _state: DesasignarInspectorState,
  formData: FormData,
): Promise<DesasignarInspectorState> {
  // 1. Sesión / autorización
  const session = await getSession()
  if (!session) return { ok: false, error: 'Sesión expirada. Por favor inicia sesión nuevamente.' }
  if (!can(session, 'ordenes.asignar')) {
    return { ok: false, error: 'No autorizado.' }
  }

  // 2. Datos del formulario
  const orderItemId = getNumber(formData, 'orderItemId')
  const empleadoId = getNumber(formData, 'empleadoId')
  if (!Number.isFinite(orderItemId) || orderItemId <= 0 || !Number.isFinite(empleadoId) || empleadoId <= 0) {
    return { ok: false, error: 'Datos incompletos.' }
  }

  // 3. Delegar la lógica de desasignación al service
  const result = await desasignarInspector(orderItemId, empleadoId, session.accessToken)

  if (result.ok) {
    revalidatePath('/supervisor/carga-trabajo')
    revalidatePath('/superusuario/carga-trabajo')
  }

  return result
}
