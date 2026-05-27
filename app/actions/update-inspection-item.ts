'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/back/services/session'

export type IncidentInput = { description: string; count: number }

export type UpdateInspectionItemState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined

export async function updateInspectionItemAction(
  _state: UpdateInspectionItemState,
  formData: FormData,
): Promise<UpdateInspectionItemState> {
  const session = await getSession()
  if (!session) return { ok: false, error: 'No autorizado' }

  const reportId = parseInt(String(formData.get('reportId') ?? ''), 10)
  const itemId   = parseInt(String(formData.get('itemId')   ?? ''), 10)
  if (isNaN(reportId) || isNaN(itemId)) return { ok: false, error: 'Datos inválidos' }

  const ok_pieces        = Math.max(0, parseInt(String(formData.get('ok')        ?? '0'), 10))
  const ng_pieces        = Math.max(0, parseInt(String(formData.get('ng')        ?? '0'), 10))
  const recovered_pieces = Math.max(0, parseInt(String(formData.get('recovered') ?? '0'), 10))
  const scrap_pieces     = Math.max(0, parseInt(String(formData.get('scrap')     ?? '0'), 10))
  const total_pieces     = ok_pieces + ng_pieces

  let incidents: { incident_name: string; affected_pieces: number }[] = []
  try {
    const raw = JSON.parse(String(formData.get('incidents') ?? '[]')) as IncidentInput[]
    incidents = raw.map((inc) => ({ incident_name: inc.description, affected_pieces: inc.count }))
  } catch {
    // keep empty
  }

  const res = await fetch(
    `${process.env.QSYNC_API_URL}/qb_sync/daily-reports/${reportId}/items/${itemId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Token': process.env.X_APP_TOKEN ?? '',
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ total_pieces, ok_pieces, ng_pieces, scrap_pieces, recovered_pieces, incidents }),
    },
  )

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { ok: false, error: (body as { message?: string }).message ?? 'Error al actualizar el ítem' }
  }

  revalidatePath('/supervisor/reportes')
  return { ok: true }
}
