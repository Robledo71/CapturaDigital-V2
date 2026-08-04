'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { assignInformalSession } from '@/back/services/informalOrdersService'

export type AssignInformalSessionState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined

const REVALIDATE_PATHS = [
  '/supervisor/ordenes-informales',
  '/superusuario/ordenes-informales',
  '/servicio-cliente/ordenes-informales',
  '/capturacion/ordenes-informales',
]

export async function asignarSesionInformalAction(
  _state: AssignInformalSessionState,
  formData: FormData,
): Promise<AssignInformalSessionState> {
  const session = await getSession()
  if (!session) {
    return { ok: false, error: 'Sesión expirada. Por favor inicia sesión nuevamente.' }
  }
  if (!can(session, 'ordenes_informales.asignar')) {
    return { ok: false, error: 'No autorizado.' }
  }

  const itemId = Number(formData.get('itemId'))
  if (!Number.isFinite(itemId) || itemId <= 0) {
    return { ok: false, error: 'Item de orden informal inválido.' }
  }

  const inspectorIds = formData.getAll('inspectorIds').map(String).filter(Boolean)
  if (inspectorIds.length === 0) {
    return { ok: false, error: 'Selecciona al menos un inspector.' }
  }

  if (!session.empleadoId) {
    return { ok: false, error: 'Tu usuario no tiene empleado asociado.' }
  }

  try {
    const result = await assignInformalSession(
      itemId,
      {
        idSupervisor: String(session.empleadoId),
        idInspectores: inspectorIds,
      },
      session.accessToken,
    )

    if (!result.ok) {
      return { ok: false, error: result.error }
    }

    for (const path of REVALIDATE_PATHS) {
      revalidatePath(path)
    }

    return { ok: true }
  } catch {
    return { ok: false, error: 'Error inesperado al asignar inspectores.' }
  }
}
