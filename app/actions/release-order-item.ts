'use server'

import { getSession } from '@/back/services/session'
import { releaseItemFromTablet } from '@/back/services/inspectionSessionService'

export type ReleaseOrderItemState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined

export async function releaseOrderItemAction(
  _state: ReleaseOrderItemState,
  formData: FormData,
): Promise<ReleaseOrderItemState> {
  const session = await getSession()
  if (!session || session.rol !== 'supervisor') {
    return { ok: false, error: 'No autorizado' }
  }

  const orderItemId = Number(formData.get('orderItemId'))
  if (!orderItemId) return { ok: false, error: 'Item requerido' }

  return releaseItemFromTablet(orderItemId, session.accessToken)
}
