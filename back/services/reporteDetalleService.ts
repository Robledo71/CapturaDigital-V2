// TODO Fase 3: rehacer con daily_report_items y nuevo esquema. Funciones stubbeadas.
import 'server-only'

export type SamplingRule = {
  min: number
  max: number
  sampleSize: number
  maxDefects: number
}

export type SamplingItemRule = SamplingRule & {
  id: number
  description: string
  inspected: number
  rangeLabel: string
}

export type IncidentEntry = {
  description: string
  count: number
}

export type InspectionItemRow = {
  id: number
  description: string
  inspected: number
  ok: number
  ng: number
  scrap: number
  recovered: number
  incidents: IncidentEntry[]
  lote: string | null
  series: string | null
  otro: string | null
}

export type ReporteDetalleData = {
  consecutiveNumber: string
  status: string
  reportDate: Date
  createdAt: Date

  cliente: string
  planta: string
  cotizacion: string
  parte: string

  totalInspected: number
  totalOk: number
  totalNg: number
  totalScrap: number
  totalRecovered: number
  totalIncidents: number
  pzsPorIncidencia: number
  samplingItems: SamplingItemRule[]
  inspectionItems: InspectionItemRow[]
  sampleSize: number
  sampleNg: number
  sampleApproved: boolean
  sampledAt: Date | null
  signedAt: Date | null
  publishedAt: Date | null

  operadores: string
  turno: string
  tabletAlias: string

  sessionCreatedAt: Date | null
  sessionFinishedAt: Date | null

  supervisorName: string

  isLegacy: boolean
  legacyCsvTable: unknown
}

export const SAMPLING_RULES: SamplingRule[] = [
  { min: 2, max: 8, sampleSize: 2, maxDefects: 1 },
  { min: 9, max: 15, sampleSize: 2, maxDefects: 1 },
  { min: 16, max: 25, sampleSize: 2, maxDefects: 1 },
  { min: 26, max: 50, sampleSize: 2, maxDefects: 1 },
  { min: 51, max: 90, sampleSize: 2, maxDefects: 1 },
  { min: 91, max: 150, sampleSize: 2, maxDefects: 1 },
  { min: 151, max: 280, sampleSize: 5, maxDefects: 1 },
  { min: 281, max: 500, sampleSize: 8, maxDefects: 1 },
  { min: 501, max: 1200, sampleSize: 12, maxDefects: 2 },
  { min: 1201, max: 3200, sampleSize: 20, maxDefects: 2 },
  { min: 3201, max: 10000, sampleSize: 32, maxDefects: 3 },
  { min: 10001, max: 35000, sampleSize: 50, maxDefects: 4 },
  { min: 35001, max: 150000, sampleSize: 80, maxDefects: 5 },
  { min: 150001, max: 500000, sampleSize: 125, maxDefects: 6 },
]

export function getSamplingRule(inspected: number): SamplingRule | null {
  return SAMPLING_RULES.find((rule) => inspected >= rule.min && inspected <= rule.max) ?? null
}

export async function getReporteDetalle(
  _consecutiveNumber: string,
  _supervisorId: string,
): Promise<ReporteDetalleData | null> {
  return null
}

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

export async function registerSamplingDecision(
  _input: SamplingDecisionInput,
): Promise<SamplingDecisionResult> {
  return { ok: false, reason: 'not_found' }
}

export type ReportStatusTransitionResult =
  | { ok: true; status: 'signed' | 'published' }
  | { ok: false; reason: 'not_found' | 'invalid_status' }

export async function signReporte(
  _consecutiveNumber: string,
  _supervisorId: string,
): Promise<ReportStatusTransitionResult> {
  return { ok: false, reason: 'not_found' }
}

export async function publishReporte(
  _consecutiveNumber: string,
  _supervisorId: string,
): Promise<ReportStatusTransitionResult> {
  return { ok: false, reason: 'not_found' }
}
