'use server'

import { getSession } from '@/back/services/session'

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

  let res: Response
  try {
    res = await fetch(
      `${process.env.QSYNC_API_URL}/qb_sync/order-items/${orderItemId}/session`,
      {
        method: 'DELETE',
        headers: {
          'X-App-Token': process.env.X_APP_TOKEN ?? '',
          Authorization: `Bearer ${session.accessToken}`,
        },
      },
    )
  } catch {
    return { ok: false, error: 'No se pudo conectar con el servidor.' }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { ok: false, error: body.message ?? 'Error al liberar la tablet.' }
  }

  return { ok: true }
}
