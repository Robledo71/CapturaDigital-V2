import 'server-only'
import { SAMPLING_RULES, getSamplingRule, type SamplingRule } from '@/front/lib/sampling'

// Re-export para conservar la API previa (los consumidores del service no cambian).
export { SAMPLING_RULES, getSamplingRule, type SamplingRule }

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

export type ItemSampling = {
  required: boolean
  sampled: boolean
  result: 'aprobado' | 'no_aprobado' | null
  sampledPieces: number
  ng: number | null
  // true = el último muestreo NO fue aprobado y el detalle aún no se edita → hay
  // que editar la información antes de poder volver a muestrear.
  needsEdit: boolean
  observations: string | null
  sampledByName: string | null
  sampledAt: string | null
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
  // Representación legible para la tabla ("LPN: 123DG, ASN: KL34").
  identificadores: string | null
  // Pares crudos { tipo: valor } (sin lote/serie) para pre-llenar el editor.
  identificadoresRaw: Record<string, string>
  sampling: ItemSampling
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

  sessionCreatedAt: Date | null
  sessionFinishedAt: Date | null

  supervisorName: string

  /**
   * usuario_id del firmante real (report.signed_by) — usado para pedir su
   * firma vía `/api/signatures/${signedBy}`. `null` mientras el reporte no
   * esté firmado, o si el contrato no expone un id numérico (ver variante
   * informal en informalReportesService.ts).
   */
  signedBy: number | null
  /** Nombre del firmante real (report.signed_by_name), para el paso "Firmado" del timeline. */
  signedByName: string | null

  isLegacy: boolean
  legacyCsvTable: unknown
}


export type SamplingDetalleInput = {
  reportId: number
  itemId: number
  defects: number
  observations?: string | null
  accessToken: string
}

export type SamplingDetalleResult =
  | { ok: true; approved: boolean; sampledPieces: number; ng: number; maxDefects: number }
  | {
      ok: false
      reason: 'not_found' | 'invalid_status' | 'no_sampling_items' | 'item_not_found' | 'error'
    }

export type ReportStatusTransitionResult =
  | { ok: true; status: 'signed' | 'published' }
  | { ok: false; reason: 'not_found' | 'invalid_status' | 'no_signature' }

// ── Internal API response types ─────────────────────────────────────────────

type ApiIncident = {
  id: number
  incident_name: string
  affected_pieces: number
}

type ApiItemSampling = {
  required: boolean
  sampled: boolean
  sampled_pieces: number
  ok_pieces: number | null
  ng_pieces: number | null
  result: 'aprobado' | 'no_aprobado' | null
  needs_edit?: boolean
  observations?: string | null
  sampled_by_name: string | null
  sampled_at: string | null
}

type ApiItem = {
  id: number
  // Número de parte específico que inspeccionó este detalle (captura.pieza_inspeccionada).
  // Un ítem/reporte puede abarcar varios números de parte; cada detalle apunta al suyo.
  inspected_part: string | null
  total_pieces: number
  ok_pieces: number
  ng_pieces: number
  scrap_pieces: number
  recovered_pieces: number
  lote: string | null
  serie: string | null
  // The DB column is JSONB; qb_sync stores it as Record<string,string>.
  // It can also arrive as a plain string on older rows. Never assume it is
  // already a string — always serialise to string before passing to React.
  identificadores: Record<string, string> | string | null
  incidents: ApiIncident[]
  // Muestreo por ítem (captura.muestreos), keyed by este mismo item.id.
  // Puede venir ausente en filas legacy — tratar como "sin muestrear".
  sampling?: ApiItemSampling
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
  // Muestreo ahora vive por ítem (captura.muestreos). Estos dos campos son la
  // fuente de verdad agregada a nivel de reporte, calculada por qb_sync.
  fully_sampled: boolean
  sampled_at: string | null
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
    // Número de parte por fila: el que inspeccionó ese detalle. Fallback al
    // número de parte del ítem/orden si el detalle no lo tiene (filas legacy).
    partNumber: item.inspected_part ?? ctx?.part_number ?? null,
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
    identificadores: (() => {
      const idf = item.identificadores
      if (!idf) return null
      if (typeof idf === 'string') return idf
      // JSONB object: {"Identificador": "T1", "Indicador de Máquina": "X1"} → "Identificador: T1, Indicador de Máquina: X1"
      const pairs = Object.entries(idf as Record<string, unknown>)
        .filter(([, v]) => v != null && v !== '')
        .map(([k, v]) => `${k}: ${String(v)}`)
      return pairs.length > 0 ? pairs.join(', ') : null
    })(),
    identificadoresRaw:
      item.identificadores && typeof item.identificadores === 'object'
        ? (item.identificadores as Record<string, string>)
        : {},
    sampling: item.sampling
      ? {
          required: item.sampling.required,
          sampled: item.sampling.sampled,
          result: item.sampling.result,
          sampledPieces: item.sampling.sampled_pieces,
          ng: item.sampling.ng_pieces,
          needsEdit: item.sampling.needs_edit ?? false,
          observations: item.sampling.observations ?? null,
          sampledByName: item.sampling.sampled_by_name ?? null,
          sampledAt: item.sampling.sampled_at ?? null,
        }
      : {
          required: getSamplingRule(item.total_pieces) !== null,
          sampled: false,
          result: null,
          sampledPieces: 0,
          ng: null,
          needsEdit: false,
          observations: null,
          sampledByName: null,
          sampledAt: null,
        },
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

  // Piezas muestreadas / NG de muestreo se agregan a partir del muestreo POR
  // ÍTEM (nueva fuente de verdad), no del array report-wide sampling_results.
  const sampledItems = inspectionItems.filter((i) => i.sampling.sampled)
  const sampleSize = sampledItems.reduce((s, i) => s + i.sampling.sampledPieces, 0)
  const sampleNg = sampledItems.reduce((s, i) => s + (i.sampling.ng ?? 0), 0)

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

  // Estado efectivo (derivado): el status a nivel de reporte en BD ya no tiene
  // un valor intermedio 'sampling' — muestreo ahora vive por ítem
  // (captura.muestreos). El UI sigue esperando status === 'sampling' para
  // habilitar "Firmar", así que lo derivamos aquí: un reporte 'submitted'
  // cuyo `fully_sampled` es true (todos los ítems que requieren muestreo
  // tienen un muestreo aprobado) se presenta como 'sampling' ("listo para
  // firmar"). mapStatus() se conserva para el resto de transiciones y para
  // filas legacy que aún pudieran traer el status 'sampled'/'muestreado'.
  const effectiveStatus =
    report.status === 'submitted' && report.fully_sampled ? 'sampling' : mapStatus(report.status)

  return {
    reportId: report.id,
    consecutiveNumber: ctx?.quotation_consecutive ?? `RPT-${report.id}`,
    status: effectiveStatus,
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
    sampleSize,
    sampleNg,
    sampleApproved: report.fully_sampled,
    sampledAt: report.sampled_at
      ? new Date(report.sampled_at)
      : latestSampling?.sampled_at
        ? new Date(latestSampling.sampled_at)
        : null,
    signedAt: report.signed_at ? new Date(report.signed_at) : null,
    publishedAt: report.published_at ? new Date(report.published_at) : null,

    operadores,
    turno: report.shift ?? '—',

    sessionCreatedAt: ctx?.fecha_inicio ? new Date(ctx.fecha_inicio) : null,
    sessionFinishedAt: ctx?.fecha_fin ? new Date(ctx.fecha_fin) : null,

    supervisorName: ctx?.supervisor_name ?? '',

    signedBy: report.signed_by ?? null,
    signedByName: report.signed_by_name ?? null,

    isLegacy: false,
    legacyCsvTable: null,
  }
}

export async function registerSamplingDetalle(
  input: SamplingDetalleInput,
): Promise<SamplingDetalleResult> {
  const res = await fetch(
    `${process.env.QSYNC_API_URL}/qb_sync/daily-reports/${input.reportId}/sampling`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...apiHeaders(input.accessToken),
      },
      body: JSON.stringify({ item_id: input.itemId, defects: input.defects, observations: input.observations ?? null }),
    },
  )

  if (res.status === 404) return { ok: false, reason: 'not_found' }

  if (res.status === 409 || res.status === 422) {
    const body = await res.json().catch(() => ({}))
    const knownReasons = ['invalid_status', 'no_sampling_items', 'item_not_found'] as const
    type KnownReason = (typeof knownReasons)[number]
    const r: KnownReason = knownReasons.includes(body.reason) ? body.reason : 'invalid_status'
    return { ok: false, reason: r }
  }

  if (!res.ok) return { ok: false, reason: 'error' }

  const body = await res.json().catch(() => ({}))
  const data = body?.data ?? {}

  return {
    ok: true,
    approved: Boolean(data.approved),
    sampledPieces: Number(data.sampled_pieces) || 0,
    ng: Number(data.ng) || 0,
    maxDefects: Number(data.max_defects) || 0,
  }
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
  if (res.status === 422) {
    const body = await res.json().catch(() => ({}))
    return { ok: false, reason: body.reason === 'no_signature' ? 'no_signature' : 'invalid_status' }
  }
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
