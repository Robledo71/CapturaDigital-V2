'use server'

import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'

export type UploadOrderDocumentState =
  | { ok: true; docType: 'hoe' | 'arranque-seguro'; orderItemId: number }
  | { ok: false; error: string }
  | undefined

export async function uploadOrderDocumentAction(
  _state: UploadOrderDocumentState,
  formData: FormData,
): Promise<UploadOrderDocumentState> {
  const session = await getSession()
  if (!session || !can(session, 'ordenes.documentos')) {
    return { ok: false, error: 'No autorizado' }
  }

  const orderItemIdRaw = String(formData.get('orderItemId') ?? '').trim()
  const docType = String(formData.get('docType') ?? '').trim()
  const file = formData.get('file') as File | null

  const orderItemId = parseInt(orderItemIdRaw, 10)
  if (!orderItemIdRaw || isNaN(orderItemId) || orderItemId <= 0) {
    return { ok: false, error: 'ID de item inválido' }
  }
  if (docType !== 'hoe' && docType !== 'arranque-seguro') {
    return { ok: false, error: 'Tipo de documento inválido' }
  }
  if (!file || file.size === 0) {
    return { ok: false, error: 'No se seleccionó ningún archivo' }
  }
  if (file.size > 20 * 1024 * 1024) {
    return { ok: false, error: 'El archivo excede el límite de 20 MB' }
  }

  const fieldName = docType === 'hoe' ? 'hoe' : 'arranque_seguro'
  const body = new FormData()
  body.append(fieldName, file)

  const res = await fetch(
    `${process.env.QSYNC_API_URL}/qb_sync/order-items/${orderItemId}/documents/${docType}`,
    {
      method: 'POST',
      headers: {
        'X-App-Token': process.env.X_APP_TOKEN ?? '',
        Authorization: `Bearer ${session.accessToken}`,
      },
      body,
    },
  )

  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    return {
      ok: false,
      error: (json as { message?: string }).message ?? `Error ${res.status} al subir el archivo`,
    }
  }

  return { ok: true, docType: docType as 'hoe' | 'arranque-seguro', orderItemId }
}
