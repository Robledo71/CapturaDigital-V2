import 'server-only'
import {
  createItemWithSession,
  closeInspectorSession,
  type OrderItemTree,
  type SessionApiResult,
} from '@/back/repositories/inspectionSessionRepository'

export type { OrderItemTree, OtherItemEntry } from '@/back/repositories/inspectionSessionRepository'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AssignResult = { ok: true } | { ok: false; error: string }

export type AssignItemInput = {
  /** QB pass-through tree (order + quotation + orderItem) — always sent, since every assignment upserts the tree. */
  tree: OrderItemTree
  /** empleado_id of the supervisor performing the assignment. */
  supervisorId: string | number
  /** empleado_id of each inspector to assign the item to. */
  inspectorIds: string[]
}

// ---------------------------------------------------------------------------
// Error mapping — qb_sync status/message → friendly Spanish text
// ---------------------------------------------------------------------------

function mapAssignError(result: Extract<SessionApiResult, { ok: false }>): string {
  if (result.status === 0) {
    return 'No se pudo conectar con el servidor. Intenta nuevamente.'
  }
  // 409 = conflicto de regla de negocio (inspector con sesión activa, reporte ya enviado, etc.).
  if (result.status === 409) {
    return result.message ?? 'No se pudo asignar (conflicto de sesión o reporte existente).'
  }
  if (result.status === 403) {
    return result.message ?? 'No autorizado para asignar en esta planta.'
  }
  return result.message ?? 'Error al asignar el inspector.'
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Assign an item to N inspectors. Always upserts the full Order → Quotation →
 * OrderItem tree and creates one inspection session per inspector.
 */
export async function assignItemToInspectors(
  input: AssignItemInput,
  accessToken: string,
): Promise<AssignResult> {
  const session = {
    idSupervisor: String(input.supervisorId),
    idInspectores: input.inspectorIds,
  }

  const result = await createItemWithSession(input.tree, session, accessToken)

  if (!result.ok) return { ok: false, error: mapAssignError(result) }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Error mapping — desasignar (close session) qb_sync status/message → Spanish
// ---------------------------------------------------------------------------

function mapDesasignarError(result: Extract<SessionApiResult, { ok: false }>): string {
  if (result.status === 0) {
    return 'No se pudo conectar con el servidor. Intenta nuevamente.'
  }
  if (result.status === 403) {
    return result.message ?? 'No autorizado para desasignar en esta planta.'
  }
  return result.message ?? 'No se pudo desasignar al inspector.'
}

/**
 * Close a single inspector's session on an order-item (finish/remove them from
 * the job), leaving any other assigned inspectors untouched.
 */
export async function desasignarInspector(
  orderItemId: number,
  empleadoId: number,
  accessToken: string,
): Promise<AssignResult> {
  const result = await closeInspectorSession(orderItemId, empleadoId, accessToken)

  if (!result.ok) return { ok: false, error: mapDesasignarError(result) }
  return { ok: true }
}
