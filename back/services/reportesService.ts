// TODO Fase 3: rehacer con daily_report_items y nuevo esquema. Funciones stubbeadas.
import 'server-only'

export type ReporteEstatus = 'Pendiente' | 'Enviado' | 'En muestreo' | 'Firmado' | 'Publicado'

export type ReporteRow = {
  id: string
  orderId: number
  cliente: string
  planta: string
  cotizacion: string
  parte: string
  inspector: string
  turno: string
  estatus: ReporteEstatus
  piezas: string
  pctNG: string
}

export type ReportesResult = {
  rows: ReporteRow[]
  total: number
}

export const PAGE_SIZE = 20

export async function getUnassignedCount(): Promise<number> {
  return 0
}

export async function getSupervisorReportes(
  _supervisorId: string,
  _mode: 'assigned' | 'unassigned' = 'assigned',
  _page: number = 1,
): Promise<ReportesResult> {
  return { rows: [], total: 0 }
}

// Re-export types used by reporte workflow
export type SamplingDecisionInput = {
  consecutiveNumber: string
  supervisorId: string
  decision: 'approve' | 'reject'
  defectsByItem: Record<number, number>
  notes?: string
}

export type SamplingDecisionResult =
  | { ok: true; status: 'sampling' | 'pending' }
  | { ok: false; reason: 'not_found' | 'invalid_status' | 'no_sampling_items' | 'rule_failed' | 'notes_required' }

export type ReportStatusTransitionResult =
  | { ok: true; status: 'signed' | 'published' }
  | { ok: false; reason: 'not_found' | 'invalid_status' }
