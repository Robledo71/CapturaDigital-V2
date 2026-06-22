'use server'

import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getReporteDetalle, type ReporteDetalleData } from '@/back/services/reporteDetalleService'

export type GetReporteDetalleResult =
  | { ok: true; reporte: ReporteDetalleData }
  | { ok: false; error: string }

/**
 * Devuelve el detalle de un reporte para mostrarlo en modal (vista read-only).
 * Guardado por `reportes.ver` — la frontera real de seguridad.
 */
export async function getReporteDetalleAction(id: string): Promise<GetReporteDetalleResult> {
  const session = await getSession()
  if (!session || !can(session, 'reportes.ver')) {
    return { ok: false, error: 'No autorizado' }
  }

  const reporte = await getReporteDetalle(id, session.accessToken)
  if (!reporte) return { ok: false, error: 'Reporte no encontrado.' }

  return { ok: true, reporte }
}
