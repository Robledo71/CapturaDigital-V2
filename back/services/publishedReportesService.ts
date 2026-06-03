import 'server-only'

export type PublishedReporteRow = {
  id: string
  cliente: string
  planta: string
  cotizacion: string
  parte: string
  piezas: number
  pctNG: number
  publicadoAt: string
  supervisor: string
}

export type PublishedReportesStats = {
  total: number
  totalPiezas: number
}

export type PublishedReportesResult = {
  ok: true
  stats: PublishedReportesStats
  rows: PublishedReporteRow[]
}

// ─── Excel types ──────────────────────────────────────────────────────────────

export type ExcelItem = {
  descripcion: string
  inspected: number
  ok: number
  ng: number
  scrap: number
  recovered: number
  incidents: string
  lote: string
  series: string
  otro: string
}

export type ExcelReporteData = {
  consecutiveNumber: string
  item: string
  planta: string
  clienteCobro: string
  folio: string
  turno: string
  reportDate: string
  numeroParte: string
  nombreParte: string
  columnA: string
  totalInspected: number
  totalOk: number
  totalNg: number
  totalRecovered: number
  totalScrap: number
  pzasXHr: string
  hrsEnReportes: string
  tipoServicio: string
  reviso: string
  supervisor: string
  ingeniero: string
  incidencias: string
  fechas: string
  series: string
  lotes: string
  destinatarios: string
  idioma: string
  resumen: string
  firma: string
  capturista: string
  cotizacion: string
  status: string
  acumulado: string
  fechaEnvio: string
  pctNG: string
  items: ExcelItem[]
}

// ─── Internal qb_sync response types ─────────────────────────────────────────

interface QbSyncPublishedRow {
  id: number
  published_at: string | null
  client_name: string | null
  plant_name: string | null
  cotizacion: string | null
  part_number: string | null
  total_pieces: number
  ng_pieces: number
  supervisor_name: string | null
}

interface QbSyncPublishedData {
  stats: { total: number; totalPiezas: number }
  rows: QbSyncPublishedRow[]
}

interface QbSyncIncident {
  id: number
  incident_name: string
  affected_pieces: number
}

interface QbSyncItem {
  id: number
  total_pieces: number
  ok_pieces: number
  ng_pieces: number
  scrap_pieces: number
  recovered_pieces: number
  lote: string | null
  serie: string | null
  identificadores: unknown
  incidents: QbSyncIncident[]
}

interface QbSyncOrderContext {
  part_number: string | null
  part_name: string | null
  quotation_consecutive: string | null
  order_consecutive: string | null
  client_name: string | null
  plant_name: string | null
  supervisor_name: string | null
  language: string | null
}

interface QbSyncFullReport {
  id: number
  shift: string | null
  report_date: string
  status: string
  signed_by_name: string | null
  published_at: string | null
  published_by_name: string | null
  items: QbSyncItem[]
  order_context: QbSyncOrderContext | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE = () => process.env.QSYNC_API_URL ?? 'http://localhost:3001'

function apiHeaders(accessToken: string): Record<string, string> {
  return {
    'X-App-Token': process.env.X_APP_TOKEN ?? '',
    Authorization: `Bearer ${accessToken}`,
  }
}

function mapPublishedRow(raw: QbSyncPublishedRow): PublishedReporteRow {
  const totalPiezas = Number(raw.total_pieces)
  const ngPiezas    = Number(raw.ng_pieces)
  return {
    id:          String(raw.id),
    cliente:     raw.client_name    ?? '—',
    planta:      raw.plant_name     ?? '—',
    cotizacion:  raw.cotizacion     ?? '—',
    parte:       raw.part_number    ?? '—',
    piezas:      totalPiezas,
    pctNG:       totalPiezas > 0 ? ngPiezas / totalPiezas : 0,
    publicadoAt: raw.published_at   ?? new Date().toISOString(),
    supervisor:  raw.supervisor_name ?? '—',
  }
}

function formatDateMX(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function mapToExcelData(report: QbSyncFullReport): ExcelReporteData {
  const ctx   = report.order_context
  const items = report.items ?? []

  const totalInspected = items.reduce((s, i) => s + (i.total_pieces    ?? 0), 0)
  const totalOk        = items.reduce((s, i) => s + (i.ok_pieces       ?? 0), 0)
  const totalNg        = items.reduce((s, i) => s + (i.ng_pieces       ?? 0), 0)
  const totalScrap     = items.reduce((s, i) => s + (i.scrap_pieces    ?? 0), 0)
  const totalRecovered = items.reduce((s, i) => s + (i.recovered_pieces ?? 0), 0)

  const allIncidentNames = items.flatMap((i) =>
    (i.incidents ?? []).map((inc) => inc.incident_name),
  )
  const uniqueIncidents = [...new Set(allIncidentNames)].filter(Boolean).join(', ')

  const pctNG = totalInspected > 0
    ? `${((totalNg / totalInspected) * 100).toFixed(2)}%`
    : '0%'

  const reportDateStr = formatDateMX(report.report_date)
  const publishedAtStr = formatDateMX(report.published_at)

  const excelItems: ExcelItem[] = items.map((item, idx) => ({
    descripcion: `Ítem ${idx + 1}`,
    inspected:   item.total_pieces     ?? 0,
    ok:          item.ok_pieces        ?? 0,
    ng:          item.ng_pieces        ?? 0,
    scrap:       item.scrap_pieces     ?? 0,
    recovered:   item.recovered_pieces ?? 0,
    incidents:   (item.incidents ?? [])
      .map((inc) => `${inc.incident_name} (${inc.affected_pieces} pzs)`)
      .join('; '),
    lote:   item.lote   ?? '',
    series: item.serie  ?? '',
    otro:   (() => {
      if (!item.identificadores) return ''
      if (Array.isArray(item.identificadores)) return (item.identificadores as unknown[]).join(', ')
      if (typeof item.identificadores === 'string') return item.identificadores
      return JSON.stringify(item.identificadores)
    })(),
  }))

  return {
    consecutiveNumber: String(report.id),
    item:              ctx?.part_number          ?? '—',
    planta:            ctx?.plant_name           ?? '—',
    clienteCobro:      ctx?.client_name          ?? '—',
    folio:             ctx?.order_consecutive    ?? '—',
    turno:             report.shift              ?? '—',
    reportDate:        reportDateStr,
    numeroParte:       ctx?.part_number          ?? '—',
    nombreParte:       ctx?.part_name            ?? '—',
    columnA:           '',
    totalInspected,
    totalOk,
    totalNg,
    totalRecovered,
    totalScrap,
    pzasXHr:           '',
    hrsEnReportes:     '',
    tipoServicio:      '',
    reviso:            report.signed_by_name     ?? '—',
    supervisor:        ctx?.supervisor_name      ?? '—',
    ingeniero:         '',
    incidencias:       uniqueIncidents,
    fechas:            reportDateStr,
    series:            [...new Set(items.map(i => i.serie).filter(Boolean))].join(', '),
    lotes:             [...new Set(items.map(i => i.lote).filter(Boolean))].join(', '),
    destinatarios:     '',
    idioma:            ctx?.language ?? '',
    resumen:           '',
    firma:             '',
    capturista:        '',
    cotizacion:        ctx?.quotation_consecutive ?? '—',
    status:            'Publicado',
    acumulado:         '',
    fechaEnvio:        publishedAtStr,
    pctNG,
    items:             excelItems,
  }
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function getPublishedReportes(
  accessToken: string,
): Promise<PublishedReportesResult> {
  const res = await fetch(`${BASE()}/qb_sync/daily-reports/published`, {
    headers: apiHeaders(accessToken),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`getPublishedReportes failed: ${res.status}`)
  const body = await res.json() as { success: boolean; data: QbSyncPublishedData }
  return {
    ok:    true,
    stats: body.data.stats,
    rows:  body.data.rows.map(mapPublishedRow),
  }
}

export async function getReporteForExcel(
  reportId: string,
  accessToken: string,
): Promise<ExcelReporteData | null> {
  const id = parseInt(reportId, 10)
  if (isNaN(id)) return null

  const res = await fetch(`${BASE()}/qb_sync/daily-reports/${id}/excel-data`, {
    headers: apiHeaders(accessToken),
    cache: 'no-store',
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`getReporteForExcel failed: ${res.status}`)

  const body = await res.json() as { success: boolean; data: QbSyncFullReport }
  return mapToExcelData(body.data)
}
