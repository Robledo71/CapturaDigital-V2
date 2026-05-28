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
  partName: string | null
  partNumber: string | null
  inspected: number
  ok: number
  ng: number
  scrap: number
  recovered: number
  incidents: IncidentEntry[]
  lote: string | null
  serie: string | null
  identificadores: string | null
}

export type ReporteDetalleData = {
  reportId: number
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

export type SamplingDecisionInput = {
  reportId: number
  accessToken: string
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

// ── Internal API response types ─────────────────────────────────────────────

type ApiIncident = {
  id: number
  incident_name: string
  affected_pieces: number
}

type ApiItem = {
  id: number
  total_pieces: number
  ok_pieces: number
  ng_pieces: number
  scrap_pieces: number
  recovered_pieces: number
  lote: string | null
  serie: string | null
  identificadores: string | null
  incidents: ApiIncident[]
}

type ApiOperator = {
  id: number
  operator_name: string
}

type ApiSamplingResult = {
  id: number
  sampled_by: number
  sampled_by_name: string
  sampled_pieces: number
  ok_pieces: number
  ng_pieces: number
  observations: string | null
  approved: boolean
  sampled_at: string
}

type ApiOrderContext = {
  order_item_id: number
  part_number: string | null
  part_name: string | null
  quotation_id: number
  quotation_consecutive: string | null
  quotation_status: string
  order_id: number
  client_name: string | null
  order_consecutive: string | null
  plant_name: string | null
  id_session: number | null
  id_supervisor: string | null
  supervisor_name: string | null
  id_tablet: string | null
  tablet_alias: string | null
  session_status: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
}

type ApiDailyReport = {
  id: number
  order_item_id: number
  shift: string | null
  report_date: string
  status: string
  signed_at: string | null
  signed_by: number | null
  signed_by_name: string | null
  published_at: string | null
  published_by: number | null
  published_by_name: string | null
  created_at: string
  updated_at: string
  items: ApiItem[]
  operators: ApiOperator[]
  sampling_results: ApiSamplingResult[]
  order_context: ApiOrderContext | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapStatus(dbStatus: string): string {
  // DB stores English values
  if (dbStatus === 'submitted')  return 'submitted'
  if (dbStatus === 'sampled')    return 'sampling'
  if (dbStatus === 'signed')     return 'signed'
  if (dbStatus === 'published')  return 'published'
  // Legacy Spanish values (pre-migration rows)
  if (dbStatus === 'enviado')    return 'submitted'
  if (dbStatus === 'muestreado') return 'sampling'
  if (dbStatus === 'firmado')    return 'signed'
  if (dbStatus === 'publicado')  return 'published'
  return 'submitted'
}

function apiHeaders(accessToken: string) {
  return {
    'X-App-Token': process.env.X_APP_TOKEN ?? '',
    Authorization: `Bearer ${accessToken}`,
  }
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function getReporteDetalle(
  id: string,
  accessToken: string,
): Promise<ReporteDetalleData | null> {
  const reportId = parseInt(id, 10)
  if (isNaN(reportId)) return null

  const res = await fetch(
    `${process.env.QSYNC_API_URL}/qb_sync/daily-reports/${reportId}`,
    { headers: apiHeaders(accessToken), cache: 'no-store' },
  )

  if (res.status === 404) return null
  if (!res.ok) throw new Error(`getReporteDetalle failed: ${res.status}`)

  const body = await res.json()
  const report: ApiDailyReport = body.data
  const ctx = report.order_context

  const inspectionItems: InspectionItemRow[] = report.items.map((item) => ({
    id: item.id,
    partName: ctx?.part_name ?? null,
    partNumber: ctx?.part_number ?? null,
    inspected: item.total_pieces,
    ok: item.ok_pieces,
    ng: item.ng_pieces,
    scrap: item.scrap_pieces,
    recovered: item.recovered_pieces,
    incidents: item.incidents.map((inc) => ({
      description: inc.incident_name ?? '—',
      count: inc.affected_pieces,
    })),
    lote: item.lote ?? null,
    serie: item.serie ?? null,
    identificadores: item.identificadores ?? null,
  }))

  const samplingItems: SamplingItemRule[] = inspectionItems
    .filter((item) => getSamplingRule(item.inspected) !== null)
    .map((item) => {
      const rule = getSamplingRule(item.inspected)!
      return {
        ...rule,
        id: item.id,
        description: item.partName ?? item.partNumber ?? `Ítem ${item.id}`,
        inspected: item.inspected,
        rangeLabel: `${rule.min}–${rule.max}`,
      }
    })

  const latestSampling = report.sampling_results[0] ?? null

  const totalInspected = inspectionItems.reduce((s, i) => s + i.inspected, 0)
  const totalOk = inspectionItems.reduce((s, i) => s + i.ok, 0)
  const totalNg = inspectionItems.reduce((s, i) => s + i.ng, 0)
  const totalScrap = inspectionItems.reduce((s, i) => s + i.scrap, 0)
  const totalRecovered = inspectionItems.reduce((s, i) => s + i.recovered, 0)
  const totalIncidents = inspectionItems.reduce((s, i) => s + i.incidents.length, 0)
  const pzsPorIncidencia = inspectionItems.reduce(
    (s, i) => s + i.incidents.reduce((si, inc) => si + inc.count, 0),
    0,
  )

  const operadores = report.operators
    .map((o) => o.operator_name ?? '')
    .filter(Boolean)
    .join(', ')

  return {
    reportId: report.id,
    consecutiveNumber: ctx?.quotation_consecutive ?? `RPT-${report.id}`,
    status: mapStatus(report.status),
    reportDate: new Date(report.report_date),
    createdAt: new Date(report.created_at),

    cliente: ctx?.client_name ?? '—',
    planta: ctx?.plant_name ?? '—',
    cotizacion: ctx?.quotation_consecutive ?? '—',
    parte: ctx?.part_number ?? '—',

    totalInspected,
    totalOk,
    totalNg,
    totalScrap,
    totalRecovered,
    totalIncidents,
    pzsPorIncidencia,
    samplingItems,
    inspectionItems,
    sampleSize: latestSampling?.sampled_pieces ?? 0,
    sampleNg: latestSampling?.ng_pieces ?? 0,
    sampleApproved: latestSampling?.approved ?? false,
    sampledAt: latestSampling?.sampled_at ? new Date(latestSampling.sampled_at) : null,
    signedAt: report.signed_at ? new Date(report.signed_at) : null,
    publishedAt: report.published_at ? new Date(report.published_at) : null,

    operadores,
    turno: report.shift ?? '—',
    tabletAlias: ctx?.tablet_alias ?? ctx?.id_tablet ?? '—',

    sessionCreatedAt: ctx?.fecha_inicio ? new Date(ctx.fecha_inicio) : null,
    sessionFinishedAt: ctx?.fecha_fin ? new Date(ctx.fecha_fin) : null,

    supervisorName: ctx?.supervisor_name ?? '',

    isLegacy: false,
    legacyCsvTable: null,
  }
}

export async function registerSamplingDecision(
  input: SamplingDecisionInput,
): Promise<SamplingDecisionResult> {
  const defectsByItemStr: Record<string, number> = {}
  for (const [key, val] of Object.entries(input.defectsByItem)) {
    defectsByItemStr[String(key)] = val
  }

  const res = await fetch(
    `${process.env.QSYNC_API_URL}/qb_sync/daily-reports/${input.reportId}/sampling`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...apiHeaders(input.accessToken),
      },
      body: JSON.stringify({
        decision: input.decision,
        defects_by_item: defectsByItemStr,
        notes: input.notes,
      }),
    },
  )

  if (res.status === 404) return { ok: false, reason: 'not_found' }
  if (res.status === 409) return { ok: false, reason: 'invalid_status' }

  if (res.status === 422) {
    const body = await res.json().catch(() => ({}))
    const knownReasons = ['notes_required', 'no_sampling_items', 'rule_failed', 'invalid_status'] as const
    type KnownReason = (typeof knownReasons)[number]
    const r: KnownReason = knownReasons.includes(body.reason) ? body.reason : 'invalid_status'
    return { ok: false, reason: r }
  }

  if (!res.ok) throw new Error(`sampling failed: ${res.status}`)

  return { ok: true, status: input.decision === 'approve' ? 'sampling' : 'pending' }
}

export async function signReporte(
  reportId: number,
  accessToken: string,
): Promise<ReportStatusTransitionResult> {
  const res = await fetch(
    `${process.env.QSYNC_API_URL}/qb_sync/daily-reports/${reportId}/sign`,
    { method: 'POST', headers: apiHeaders(accessToken) },
  )

  if (res.status === 404) return { ok: false, reason: 'not_found' }
  if (res.status === 409) return { ok: false, reason: 'invalid_status' }
  if (!res.ok) throw new Error(`sign failed: ${res.status}`)

  return { ok: true, status: 'signed' }
}

export async function publishReporte(
  reportId: number,
  accessToken: string,
): Promise<ReportStatusTransitionResult> {
  const res = await fetch(
    `${process.env.QSYNC_API_URL}/qb_sync/daily-reports/${reportId}/publish`,
    { method: 'POST', headers: apiHeaders(accessToken) },
  )

  if (res.status === 404) return { ok: false, reason: 'not_found' }
  if (res.status === 409) return { ok: false, reason: 'invalid_status' }
  if (!res.ok) throw new Error(`publish failed: ${res.status}`)

  return { ok: true, status: 'published' }
}
