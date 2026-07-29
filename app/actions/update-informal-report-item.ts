'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { updateInformalReportItem } from '@/back/services/informalReportesService'

export type IncidentInput = { description: string; count: number }

export type UpdateInformalReportItemState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined

export async function updateInformalReportItemAction(
  _state: UpdateInformalReportItemState,
  formData: FormData,
): Promise<UpdateInformalReportItemState> {
  const session = await getSession()
  if (!session || !can(session, 'reportes_informales.editar')) {
    return { ok: false, error: 'No autorizado' }
  }

  const reportId = parseInt(String(formData.get('reportId') ?? ''), 10)
  const itemId   = parseInt(String(formData.get('itemId')   ?? ''), 10)
  if (isNaN(reportId) || isNaN(itemId)) return { ok: false, error: 'Datos inválidos' }

  function safeInt(key: string): number {
    const n = parseInt(String(formData.get(key) ?? '0'), 10)
    return isNaN(n) ? 0 : Math.max(0, n)
  }

  const ok_pieces  = safeInt('ok')
  const ng_pieces  = safeInt('ng')
  // recovered cannot exceed ng — clamp so the backend never gets a semantically
  // invalid state (mismo criterio que update-inspection-item.ts).
  const recovered_pieces = Math.min(ng_pieces, safeInt('recovered'))
  const scrap_pieces     = Math.max(0, ng_pieces - recovered_pieces)
  const rawTotal = parseInt(String(formData.get('total') ?? ''), 10)
  const total_pieces = isNaN(rawTotal) ? ok_pieces + ng_pieces : Math.max(ok_pieces + ng_pieces, rawTotal)

  const motivo = String(formData.get('motivo') ?? '').trim()
  if (!motivo) return { ok: false, error: 'El motivo de edición es obligatorio.' }

  let incidents: { incident_name: string; affected_pieces: number }[] = []
  try {
    const raw = JSON.parse(String(formData.get('incidents') ?? '[]')) as IncidentInput[]
    incidents = raw.map((inc) => ({ incident_name: inc.description, affected_pieces: inc.count }))
  } catch {
    // keep empty
  }

  const result = await updateInformalReportItem({
    reportId,
    itemId,
    accessToken: session.accessToken,
    totalPieces: total_pieces,
    okPieces: ok_pieces,
    ngPieces: ng_pieces,
    scrapPieces: scrap_pieces,
    recoveredPieces: recovered_pieces,
    incidents,
    motivo,
  })

  if (!result.ok) return { ok: false, error: result.error }

  revalidatePath('/supervisor/reportes-informales')
  revalidatePath('/superusuario/reportes-informales')
  revalidatePath('/servicio-cliente/reportes-informales')
  revalidatePath('/capturacion/reportes-informales')

  return { ok: true }
}
