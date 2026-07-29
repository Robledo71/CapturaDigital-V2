import 'server-only'
import { getSamplingRule } from '@/front/lib/sampling'
import type {
  ReporteDetalleData,
  InspectionItemRow,
  SamplingItemRule,
  SamplingDecisionInput,
  SamplingDecisionResult,
} from '@/back/services/reporteDetalleService'

// Re-exporta los tipos que el consumidor (acciones/UI) necesita para no acoplarse
// también a reporteDetalleService — mismo patrón que reporteDetalleService hace con
// front/lib/sampling.
export type { ReporteDetalleData, InspectionItemRow, SamplingDecisionInput, SamplingDecisionResult }

// ── Tipos públicos ──────────────────────────────────────────────────────────

export type InformalReporteListRow = {
  id: number
  status: 'submitted' | 'signed'
  tipoOrden: 'OV' | 'OA'
  clienteNombre: string | null
  plantaNombre: string | null
  numeroParte: string
  nombreParte: string | null
  inspector: string | null
  horario: string | null
  fechaCreado: Date
  fechaFirmado: Date | null
}

export type InformalSignResult =
  | { ok: true; status: 'signed' }
  | { ok: false; reason: 'not_found' | 'invalid_status' }

// ── Tipos internos de la respuesta de qb_sync ───────────────────────────────
// Ver qb_sync/src/modules/informal-reports/{repository,service}.js — la lista viene
// directo de SQL (snake_case) y el detalle es el envelope de getReportSummary().

type ApiInformalReporteListRaw = {
  id: number
  status: 'submitted' | 'signed'
  tipo_orden: 'OV' | 'OA'
  cliente_nombre: string | null
  planta_nombre: string | null
  numero_parte: string
  nombre_parte: string | null
  inspector: string | null
  horario: string | null
  fecha_creado: string
  fecha_firmado: string | null
}

type ApiInformalIncident = {
  incident_name: string
  affected_pieces: number
}

type ApiInformalItemSampling = {
  required: boolean
  sampled: boolean
  sampled_pieces: number
  ok_pieces: number | null
  ng_pieces: number | null
  result: 'aprobado' | 'no_aprobado' | null
  sampled_by_name: string | null
  sampled_at: string | null
}

type ApiInformalItem = {
  id: number
  identifier: {
    lote: string | null
    serie: string | null
    // JSONB con el resto de identificadores (sin lote/serie). Igual que el
    // formal: puede llegar como objeto o, en filas viejas, string plano.
    otros: Record<string, string> | string | null
  }
  total_pieces: number
  ok_pieces: number
  ng_pieces: number
  scrap_pieces: number
  recovered_pieces: number
  pieces_by_incident: ApiInformalIncident[]
  sampling: ApiInformalItemSampling
}

type ApiInformalReportSummary = {
  id: number
  status: 'submitted' | 'signed'
  report_date: string
  sampled_at: string | null
  fully_sampled: boolean
  shift: string | null
  plant_name: string | null
  client_name: string | null
  part_number: string | null
  tipo_orden: 'OV' | 'OA' | null
  identifier_types: string[]
  incident_types: string[]
  signed_at: string | null
  signed_by: string | null
  operators: string[]
  items: ApiInformalItem[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function apiHeaders(accessToken: string): Record<string, string> {
  return {
    'X-App-Token': process.env.X_APP_TOKEN ?? '',
    Authorization: `Bearer ${accessToken}`,
  }
}

function baseUrl(): string {
  return (process.env.QSYNC_API_URL ?? '').replace(/\/$/, '')
}

function formatIdentificadores(idf: Record<string, string> | string | null): string | null {
  if (!idf) return null
  if (typeof idf === 'string') return idf
  const pairs = Object.entries(idf as Record<string, unknown>)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}: ${String(v)}`)
  return pairs.length > 0 ? pairs.join(', ') : null
}

// ── getInformalReportes ──────────────────────────────────────────────────────

export async function getInformalReportes(accessToken: string): Promise<InformalReporteListRow[]> {
  const res = await fetch(`${baseUrl()}/qb_sync/informal-reports`, {
    headers: apiHeaders(accessToken),
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`getInformalReportes failed: ${res.status}`)

  const body = await res.json()
  const rows: ApiInformalReporteListRaw[] = Array.isArray(body?.data) ? body.data : []

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    tipoOrden: row.tipo_orden,
    clienteNombre: row.cliente_nombre ?? null,
    plantaNombre: row.planta_nombre ?? null,
    numeroParte: row.numero_parte,
    nombreParte: row.nombre_parte ?? null,
    inspector: row.inspector ?? null,
    horario: row.horario ?? null,
    fechaCreado: new Date(row.fecha_creado),
    fechaFirmado: row.fecha_firmado ? new Date(row.fecha_firmado) : null,
  }))
}

// ── getInformalReporteDetalle ────────────────────────────────────────────────
//
// Reusa el mismo tipo ReporteDetalleData que el flujo formal para que
// ReporteDetallePage no necesite un modelo de datos distinto. Varios campos del
// formal (cotizacion, tablet, sesión de captura, supervisor) no existen en el
// contrato informal (las órdenes informales no tienen cotización/tablet, y
// getReportSummary() de qb_sync no expone fecha_inicio/fin ni supervisor_name)
// — se rellenan con el fallback más razonable ('—' / null / '').

export async function getInformalReporteDetalle(
  id: string,
  accessToken: string,
): Promise<ReporteDetalleData | null> {
  const reportId = parseInt(id, 10)
  if (isNaN(reportId)) return null

  const res = await fetch(`${baseUrl()}/qb_sync/informal-reports/${reportId}`, {
    headers: apiHeaders(accessToken),
    cache: 'no-store',
  })

  if (res.status === 404) return null
  if (!res.ok) throw new Error(`getInformalReporteDetalle failed: ${res.status}`)

  const body = await res.json()
  const report: ApiInformalReportSummary = body.data

  const inspectionItems: InspectionItemRow[] = report.items.map((item) => ({
    id: item.id,
    partName: null,
    partNumber: report.part_number ?? null,
    inspected: item.total_pieces,
    ok: item.ok_pieces,
    ng: item.ng_pieces,
    scrap: item.scrap_pieces,
    recovered: item.recovered_pieces,
    incidents: item.pieces_by_incident.map((inc) => ({
      description: inc.incident_name ?? '—',
      count: inc.affected_pieces,
    })),
    lote: item.identifier?.lote ?? null,
    serie: item.identifier?.serie ?? null,
    identificadores: formatIdentificadores(item.identifier?.otros ?? null),
    sampling: item.sampling
      ? {
          required: item.sampling.required,
          sampled: item.sampling.sampled,
          result: item.sampling.result,
          sampledPieces: item.sampling.sampled_pieces,
          ng: item.sampling.ng_pieces,
        }
      : {
          required: getSamplingRule(item.total_pieces) !== null,
          sampled: false,
          result: null,
          sampledPieces: 0,
          ng: null,
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

  const operadores = (report.operators ?? []).filter(Boolean).join(', ')

  // Estado derivado: los reportes informales nunca pasan por 'sampled'/'published'
  // (el CHECK de la BD solo admite ENVIADO/FIRMADO) — solo 'submitted'/'signed'.
  // Igual que el formal, un 'submitted' con fully_sampled=true se presenta como
  // 'sampling' para habilitar el botón "Firmar" en la UI compartida.
  const effectiveStatus =
    report.status === 'submitted' && report.fully_sampled ? 'sampling' : report.status

  return {
    reportId: report.id,
    consecutiveNumber: `RPT-INF-${report.id}`,
    status: effectiveStatus,
    reportDate: new Date(report.report_date),
    // getReportSummary() no expone un created_at separado — fecha_creado hace
    // ambas veces de "creado" y "report_date" en el flujo informal.
    createdAt: new Date(report.report_date),

    cliente: report.client_name ?? '—',
    planta: report.plant_name ?? '—',
    // Las órdenes informales no tienen cotización — no hay equivalente.
    cotizacion: '—',
    parte: report.part_number ?? '—',

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
    sampledAt: report.sampled_at ? new Date(report.sampled_at) : null,
    signedAt: report.signed_at ? new Date(report.signed_at) : null,
    // Los reportes informales nunca se publican.
    publishedAt: null,

    operadores,
    turno: report.shift ?? '—',
    // El contrato informal no expone tablet/dispositivo de captura.
    tabletAlias: '—',

    // getReportSummary() no expone fecha_inicio/fecha_fin de la sesión de
    // inspección — se deja sin datos (la UI simplemente muestra esos pasos del
    // historial como "pendiente").
    sessionCreatedAt: null,
    sessionFinishedAt: null,

    // No hay un "supervisor" único expuesto por el contrato informal — se usa
    // el firmante cuando existe, igual que en el formal se usa order_context.supervisor_name.
    supervisorName: report.signed_by ?? '',

    isLegacy: false,
    legacyCsvTable: null,
  }
}

// ── registerInformalSamplingDecision ─────────────────────────────────────────
//
// A diferencia del flujo formal, el controller de informal-reports SIEMPRE
// responde 422 con { reason, message } cuando el service lanza un error con
// `.reason` (incluido 'invalid_status') — nunca 409 para este endpoint. Ver
// qb_sync informal-reports.controller.js#handleRegisterInformalSampling.

export async function registerInformalSamplingDecision(
  input: SamplingDecisionInput,
): Promise<SamplingDecisionResult> {
  const defectsByItemStr: Record<string, number> = {}
  for (const [key, val] of Object.entries(input.defectsByItem)) {
    defectsByItemStr[String(key)] = val
  }

  const res = await fetch(`${baseUrl()}/qb_sync/informal-reports/${input.reportId}/sampling`, {
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
  })

  if (res.status === 404) return { ok: false, reason: 'not_found' }

  if (res.status === 422) {
    const body = await res.json().catch(() => ({}))
    const knownReasons = ['notes_required', 'no_sampling_items', 'rule_failed', 'invalid_status'] as const
    type KnownReason = (typeof knownReasons)[number]
    const r: KnownReason = knownReasons.includes(body.reason) ? body.reason : 'invalid_status'
    return { ok: false, reason: r }
  }

  if (!res.ok) throw new Error(`informal sampling failed: ${res.status}`)

  return { ok: true, status: input.decision === 'approve' ? 'sampling' : 'pending' }
}

// ── updateInformalReportItem ──────────────────────────────────────────────────

export type UpdateInformalReportItemInput = {
  reportId: number
  itemId: number
  accessToken: string
  totalPieces: number
  okPieces: number
  ngPieces: number
  scrapPieces: number
  recoveredPieces: number
  incidents: { incident_name: string; affected_pieces: number }[]
  motivo: string
}

export type UpdateInformalReportItemResult = { ok: true } | { ok: false; error: string }

export async function updateInformalReportItem(
  input: UpdateInformalReportItemInput,
): Promise<UpdateInformalReportItemResult> {
  const res = await fetch(
    `${baseUrl()}/qb_sync/informal-reports/${input.reportId}/items/${input.itemId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...apiHeaders(input.accessToken),
      },
      body: JSON.stringify({
        total_pieces: input.totalPieces,
        ok_pieces: input.okPieces,
        ng_pieces: input.ngPieces,
        scrap_pieces: input.scrapPieces,
        recovered_pieces: input.recoveredPieces,
        incidents: input.incidents,
        motivo: input.motivo,
      }),
    },
  )

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { ok: false, error: (body as { message?: string }).message ?? 'Error al actualizar el ítem' }
  }

  return { ok: true }
}

// ── signInformalReporte ───────────────────────────────────────────────────────

export async function signInformalReporte(
  reportId: number,
  accessToken: string,
): Promise<InformalSignResult> {
  const res = await fetch(`${baseUrl()}/qb_sync/informal-reports/${reportId}/sign`, {
    method: 'POST',
    headers: apiHeaders(accessToken),
  })

  if (res.status === 404) return { ok: false, reason: 'not_found' }
  if (res.status === 409) return { ok: false, reason: 'invalid_status' }
  if (!res.ok) throw new Error(`sign informal report failed: ${res.status}`)

  return { ok: true, status: 'signed' }
}
