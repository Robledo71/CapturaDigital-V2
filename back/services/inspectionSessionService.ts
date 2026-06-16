import 'server-only'
import {
  createSessionForItem,
  createItemWithSession,
  deleteSessionForItem,
  type OrderItemTree,
  type SessionApiResult,
} from '@/back/repositories/inspectionSessionRepository'

export type { OrderItemTree } from '@/back/repositories/inspectionSessionRepository'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AssignResult = { ok: true } | { ok: false; error: string }

export type AssignItemInput = {
  /** 0 means the item does not exist yet in qb_sync (it came from a QB search). */
  orderItemId: number
  /** Tablet device code (codigoTablet), e.g. "TAB-001". */
  codigoTablet: string
  /** Employee code of the supervisor performing the assignment. */
  supervisorCode: string
  /** ISO timestamp marking when the assignment starts. */
  fechaInicio: string
  /** Required only when orderItemId === 0 (the item to be materialized). */
  tree?: OrderItemTree
}

// ---------------------------------------------------------------------------
// Error mapping — qb_sync status/message → friendly Spanish text
// ---------------------------------------------------------------------------

function mapAssignError(result: Extract<SessionApiResult, { ok: false }>): string {
  if (result.status === 0) {
    return 'No se pudo conectar con el servidor. Intenta nuevamente.'
  }
  // 409 = el item ya tiene una sesión activa (regla "1 item → 1 tablet").
  if (result.status === 409) {
    return result.message ?? 'Este item ya tiene una tablet asignada.'
  }
  return result.message ?? 'Error al asignar la tablet.'
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Assign an item to a tablet. If the item is new (orderItemId === 0) it is
 * materialized together with its session; otherwise only the session is added.
 */
export async function assignItemToTablet(
  input: AssignItemInput,
  accessToken: string,
): Promise<AssignResult> {
  const session = {
    idSupervisor: input.supervisorCode,
    idTablet: input.codigoTablet,
    fechaInicio: input.fechaInicio,
  }

  const result =
    input.orderItemId === 0 && input.tree
      ? await createItemWithSession(input.tree, session, accessToken)
      : await createSessionForItem(input.orderItemId, session, accessToken)

  if (!result.ok) return { ok: false, error: mapAssignError(result) }
  return { ok: true }
}

/** Release a tablet by deleting the item's active inspection session. */
export async function releaseItemFromTablet(
  orderItemId: number,
  accessToken: string,
): Promise<AssignResult> {
  const result = await deleteSessionForItem(orderItemId, accessToken)

  if (!result.ok) {
    if (result.status === 0) {
      return { ok: false, error: 'No se pudo conectar con el servidor.' }
    }
    return { ok: false, error: result.message ?? 'Error al liberar la tablet.' }
  }
  return { ok: true }
}
