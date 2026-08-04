'use server'

import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getInformalReporteDetalle } from '@/back/services/informalReportesService'
import type { ReporteDetalleData } from '@/back/services/reporteDetalleService'

export type GetInformalReporteDetalleResult =
  | { ok: true; reporte: ReporteDetalleData }
  | { ok: false; error: string }

/**
 * Devuelve el detalle de un reporte informal para el acordeón de la lista.
 * Guardado por `reportes_informales.ver`.
 */
export async function getInformalReporteDetalleAction(id: string): Promise<GetInformalReporteDetalleResult> {
  const session = await getSession()
  if (!session || !can(session, 'reportes_informales.ver')) {
    return { ok: false, error: 'No autorizado' }
  }

  const reporte = await getInformalReporteDetalle(id, session.accessToken)
  if (!reporte) return { ok: false, error: 'Reporte no encontrado.' }

  return { ok: true, reporte }
}
