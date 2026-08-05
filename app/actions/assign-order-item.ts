'use server'

import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { assignItemToInspectors } from '@/back/services/inspectionSessionService'
import { buildTree } from './_orderTree'

export type AssignOrderItemState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined

function getStr(formData: FormData, key: string): string {
  return (formData.get(key) as string | null) ?? ''
}

export async function assignOrderItemAction(
  _state: AssignOrderItemState,
  formData: FormData,
): Promise<AssignOrderItemState> {
  // 1. Sesión / autorización
  const session = await getSession()
  if (!session) return { ok: false, error: 'Sesión expirada. Por favor inicia sesión nuevamente.' }
  if (!can(session, 'ordenes.asignar')) {
    return { ok: false, error: 'No autorizado.' }
  }

  // 2. Inspectores seleccionados (checklist multi-select)
  const inspectorIds = formData.getAll('inspectorIds').map(String).filter(Boolean)
  if (inspectorIds.length === 0) {
    return { ok: false, error: 'Selecciona al menos un inspector.' }
  }

  // 3. Supervisor = usuario logueado (empleado_id), no seleccionable
  const supervisorId = session.empleadoId
  if (!supervisorId) {
    return { ok: false, error: 'Tu usuario no tiene un empleado asociado; no puedes asignar.' }
  }

  // 4. La asignación siempre pasa por el árbol completo (order/quotation/orderItem)
  if (!getStr(formData, 'qb_order_consecutive') || !getStr(formData, 'qb_quotation_consecutive')) {
    return { ok: false, error: 'Datos de la orden incompletos. Busca la cotización nuevamente.' }
  }
  const tree = buildTree(formData)

  // 5. Delegar la lógica de asignación al service
  return assignItemToInspectors(
    {
      tree,
      supervisorId,
      inspectorIds,
    },
    session.accessToken,
  )
}
