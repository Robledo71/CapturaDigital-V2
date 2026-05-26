// TODO Fase 3: rehacer con daily_report_items y nuevo esquema. Funciones stubbeadas.
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

export async function getPublishedReportes(): Promise<PublishedReportesResult> {
  return {
    ok: true,
    stats: { total: 0, totalPiezas: 0 },
    rows: [],
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

export async function getReporteForExcel(
  _consecutiveNumber: string,
): Promise<ExcelReporteData | null> {
  return null
}
