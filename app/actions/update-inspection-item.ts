'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'

export type IncidentInput = { description: string; count: number }

// Parsea el campo `identificadores` (JSON `{ tipo: valor }`) del FormData a un
// objeto limpio (tipos/valores recortados, sin vacíos). Devuelve null si no hay
// ninguno válido, para que el backend guarde JSONB sin esa clave.
function parseIdentificadores(raw: FormDataEntryValue | null): Record<string, string> | null {
  try {
    const parsed = JSON.parse(String(raw ?? '{}'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const entries = Object.entries(parsed as Record<string, unknown>)
      .map(([k, v]) => [String(k).trim(), String(v ?? '').trim()] as const)
      .filter(([k, v]) => k !== '' && v !== '')
    return entries.length > 0 ? Object.fromEntries(entries) : null
  } catch {
    return null
  }
}

export type UpdateInspectionItemState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined

export async function updateInspectionItemAction(
  _state: UpdateInspectionItemState,
  formData: FormData,
): Promise<UpdateInspectionItemState> {
  const session = await getSession()
  if (!session || !can(session, 'reportes.editar')) {
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
  // recovered cannot exceed ng — clamp so DB never gets a semantically invalid state
  const recovered_pieces = Math.min(ng_pieces, safeInt('recovered'))
  const scrap_pieces     = Math.max(0, ng_pieces - recovered_pieces)
  // Read total_pieces from the form (passed as a hidden field from item.inspected)
  // so we never silently overwrite a batch count that differs from ok+ng.
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

  // Identificadores editables: lote, serie y pares { tipo: valor } (LPN, ASN, …).
  // El backend normaliza los valores (mayúsculas/sin espacios).
  const lote = String(formData.get('lote') ?? '').trim() || null
  const serie = String(formData.get('serie') ?? '').trim() || null
  const identificadores = parseIdentificadores(formData.get('identificadores'))

  const res = await fetch(
    `${process.env.QSYNC_API_URL}/qb_sync/daily-reports/${reportId}/items/${itemId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Token': process.env.X_APP_TOKEN ?? '',
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ lote, serie, identificadores, total_pieces, ok_pieces, ng_pieces, scrap_pieces, recovered_pieces, incidents, motivo }),
    },
  )

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { ok: false, error: (body as { message?: string }).message ?? 'Error al actualizar el ítem' }
  }

  revalidatePath('/supervisor/reportes')
  return { ok: true }
}
