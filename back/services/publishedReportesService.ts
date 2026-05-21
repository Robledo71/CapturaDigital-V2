'server-only'

import { prisma } from '@/back/db/prisma'

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

export async function getPublishedReportes(): Promise<PublishedReportesResult> {
  const reports = await prisma.dailyReport.findMany({
    where: { status: 'published' },
    include: {
      order: {
        include: {
          client: true,
          plant: true,
          supervisor: true,
        },
      },
      quotation: true,
    },
    orderBy: { publishedAt: 'desc' },
  })

  const rows: PublishedReporteRow[] = reports.map((r) => {
    const totalInspected = Number(r.totalInspected)
    const totalNg = Number(r.totalNg)
    const pctNG = totalInspected > 0 ? totalNg / totalInspected : 0

    return {
      id: r.consecutiveNumber,
      cliente: r.order.client.name,
      planta: r.order.plant.name,
      cotizacion: r.quotation?.consecutiveNumber ?? r.order.consecutiveNumber,
      parte: r.order.partNumber ?? '—',
      piezas: Math.floor(totalInspected),
      pctNG,
      publicadoAt: (r.publishedAt ?? r.createdAt).toISOString(),
      supervisor: r.order.supervisor?.nombreCompleto ?? 'Sin asignar',
    }
  })

  const totalPiezas = rows.reduce((sum, r) => sum + r.piezas, 0)

  return {
    ok: true,
    stats: {
      total: rows.length,
      totalPiezas,
    },
    rows,
  }
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
  // ── Columnas horizontales (una fila = un reporte) ──
  consecutiveNumber: string   // NÚM DE REPORTE
  item: string                // ÍTEM
  planta: string              // PLANTA
  clienteCobro: string        // CLIENTE COBRO
  folio: string               // FOLIO
  turno: string               // TURNO
  reportDate: string          // FECHA
  numeroParte: string         // NÚMERO PARTE
  nombreParte: string         // NOMBRE PARTE
  columnA: string             // A
  totalInspected: number      // PZS. INSPECCIONADAS
  totalOk: number             // OK
  totalNg: number             // NG
  totalRecovered: number      // RECUP
  totalScrap: number          // SCRAP
  pzasXHr: string             // PZAS X HR (RATE)
  hrsEnReportes: string       // HRS EN REPORTES
  tipoServicio: string        // T. SERV.
  reviso: string              // REVISÓ
  ingeniero: string           // INGENIERO
  incidencias: string         // A)
  fechas: string              // FECHAS
  series: string              // SERIES
  lotes: string               // LOTES
  destinatarios: string       // DESTINATARIOS
  idioma: string              // IDIOMA
  resumen: string             // RESUMEN
  firma: string               // FIRMA
  capturista: string          // CAPTURISTA
  cotizacion: string          // COTIZACIÓN
  status: string              // STATUS
  acumulado: string           // ACUMULADO
  fechaEnvio: string          // FECHA ENVIO
  pctNG: string
  // ── Detalle de ítems (hoja secundaria) ──
  items: ExcelItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function formatDateTime(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const secs = String(date.getSeconds()).padStart(2, '0')
  return `${day}-${['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][date.getMonth()]}-${year} ${hours}:${minutes}:${secs}`
}

function formatIncidents(raw: unknown): string {
  if (!raw || !Array.isArray(raw) || raw.length === 0) return '—'
  const entries = (raw as unknown[]).filter(
    (e): e is { description: string; count: number } =>
      e !== null &&
      typeof e === 'object' &&
      typeof (e as Record<string, unknown>).description === 'string' &&
      typeof (e as Record<string, unknown>).count === 'number',
  )
  if (entries.length === 0) return '—'
  return entries.map((i) => `${i.description}: ${i.count}`).join(', ')
}

type LegacyItem = Record<string, unknown>

function legacyFirst(csvTable: unknown): LegacyItem | null {
  if (!Array.isArray(csvTable) || csvTable.length === 0) return null
  const first = csvTable[0]
  if (!first || typeof first !== 'object') return null
  return first as LegacyItem
}

function legacyField(item: LegacyItem | null, field: string, fallback = '—'): string {
  if (!item) return fallback
  const val = item[field]
  if (val == null || val === '') return fallback
  return String(val)
}

const STATUS_DISPLAY: Record<string, string> = {
  pending:   'PENDIENTE',
  submitted: 'ENVIADO',
  sampling:  'EN MUESTREO',
  signed:    'FIRMADO',
  published: 'PUBLICADO',
}

// ─── Main export function ─────────────────────────────────────────────────────

export async function getReporteForExcel(
  consecutiveNumber: string,
): Promise<ExcelReporteData | null> {
  const report = await prisma.dailyReport.findFirst({
    where: { consecutiveNumber, status: 'published' },
    include: {
      order: {
        include: {
          client: true,
          plant: true,
          supervisor: true,
        },
      },
      quotation: true,
      sessions: {
        orderBy: { shift: 'asc' },
        include: { items: true },
      },
    },
  })

  if (!report) return null

  const totalInspected = Number(report.totalInspected)
  const totalNg = Number(report.totalNg)
  const totalOk = Number(report.totalOk)
  const totalScrap = Number(report.totalScrap)
  const totalRecovered = Number(report.totalRecovered)
  const pctNG = totalInspected > 0
    ? ((totalNg / totalInspected) * 100).toFixed(2) + '%'
    : '0.00%'

  // ── Sessions ──
  const primarySession = report.sessions[0] ?? null
  const turno = primarySession?.shift != null
    ? String(primarySession.shift)
    : legacyField(legacyFirst(report.legacyCsvTable), 'shift')

  const capturista = primarySession?.operadores
    ?? primarySession?.inspectorName
    ?? '—'

  // ── Hours & rate (from session timestamps) ──
  const totalMs = report.sessions.reduce((sum, s) => {
    if (s.startedAt && s.finishedAt) {
      return sum + (s.finishedAt.getTime() - s.startedAt.getTime())
    }
    return sum
  }, 0)
  const totalHrs = totalMs / 3_600_000
  const hrsEnReportes = totalHrs > 0 ? totalHrs.toFixed(2) : '—'
  const pzasXHr = totalHrs > 0 && totalInspected > 0
    ? Math.round(totalInspected / totalHrs).toString()
    : '—'

  // ── Items ──
  const allItems = report.sessions.flatMap((s) => s.items)
  const itemCount = allItems.length

  const uniqueSeries = [
    ...new Set(
      allItems.map((i) => i.series).filter((s): s is string => !!s && s !== '—'),
    ),
  ]
  const uniqueLotes = [
    ...new Set(
      allItems.map((i) => i.lote).filter((l): l is string => !!l && l !== '—'),
    ),
  ]

  const items: ExcelItem[] = allItems.map((item) => ({
    descripcion: item.description?.trim() || `Item ${item.id}`,
    inspected: Math.floor(Number(item.inspected)),
    ok: Math.floor(Number(item.ok)),
    ng: Math.floor(Number(item.ng)),
    scrap: Math.floor(Number(item.scrap)),
    recovered: Math.floor(Number(item.recovered)),
    incidents: formatIncidents(item.incidents),
    lote: item.lote ?? '—',
    series: item.series ?? '—',
    otro: item.otro ?? '—',
  }))

  // ── Legacy JSONB fields ──
  const legacyCsv = legacyFirst(report.legacyCsvTable)
  const folio = legacyField(legacyCsv, 'folio')
  const columnA = legacyField(legacyCsv, 'inspected')

  return {
    consecutiveNumber: report.consecutiveNumber,
    item: itemCount > 0 ? String(itemCount) : legacyField(legacyCsv, 'folio', '0'),
    planta: report.order.plant.name,
    clienteCobro: report.order.client.name,
    folio,
    turno,
    reportDate: formatDate(report.reportDate),
    numeroParte: report.order.partNumber ?? '—',
    nombreParte: report.order.partName ?? '—',
    columnA,
    totalInspected: Math.floor(totalInspected),
    totalOk: Math.floor(totalOk),
    totalNg: Math.floor(totalNg),
    totalRecovered: Math.floor(totalRecovered),
    totalScrap: Math.floor(totalScrap),
    pzasXHr,
    hrsEnReportes,
    tipoServicio: report.order.serviceType ?? '—',
    reviso: report.order.supervisor?.nombreCompleto ?? '—',
    ingeniero: '—',
    incidencias: report.observations ?? '—',
    fechas: '—',
    series: uniqueSeries.length > 0 ? uniqueSeries.join('; ') : '—',
    lotes: uniqueLotes.length > 0 ? uniqueLotes.join('; ') : '—',
    destinatarios: '—',
    idioma: 'E',
    resumen: report.order.consecutiveNumber,
    firma: report.signedAt ? 'SI' : '',
    capturista,
    cotizacion: report.quotation?.consecutiveNumber ?? '—',
    status: STATUS_DISPLAY[report.status] ?? report.status.toUpperCase(),
    acumulado: '—',
    fechaEnvio: formatDateTime(report.publishedAt ?? report.createdAt),
    pctNG,
    items,
  }
}
