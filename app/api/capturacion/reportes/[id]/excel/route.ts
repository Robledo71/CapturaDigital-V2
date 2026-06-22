import ExcelJS from 'exceljs'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getReporteForExcel, type ExcelReporteData } from '@/back/services/publishedReportesService'

// ─── Paleta corporativa Quality Bolca ─────────────────────────────────────────
const COLORS = {
  brand:      'FF0B2F5C', // azul corporativo oscuro
  brandSoft:  'FF1E4E91', // azul medio
  headerBg:   'FF1E4E91', // header azul
  headerText: 'FFFFFFFF',
  subTitleBg: 'FFE8EEF7', // azul muy claro
  rowAlt:     'FFF5F8FC', // gris azulado claro
  totalsBg:   'FFC8E6C9', // verde claro
  totalsText: 'FF1B5E20',
  border:     'FFCBD5E1', // gris azulado
}

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getSession()

  if (!session || !can(session, 'ordenes.descargar')) {
    return Response.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id } = await params
  const reportId = decodeURIComponent(id)

  const data = await getReporteForExcel(reportId, session.accessToken)

  if (!data) {
    return Response.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 })
  }

  const buffer = await buildExcel(data)

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="reporte-${reportId}.xlsx"`,
    },
  })
}

// ─── Encabezados ──────────────────────────────────────────────────────────────

const HEADERS = [
  'NÚM DE REPORTE', 'ÍTEM', 'PLANTA', 'CLIENTE COBRO', 'FOLIO', 'TURNO',
  'FECHA', 'NÚMERO PARTE', 'NOMBRE PARTE', 'A', 'PZS. INSPECCIONADAS',
  'OK', 'NG', 'RECUP', 'SCRAP', 'PZAS X HR (RATE)', 'HRS EN REPORTES',
  'T. SERV.', 'REVISÓ', 'SUPERVISOR', 'INGENIERO', 'A)', 'FECHAS', 'SERIES', 'LOTES',
  'IDENTIFICADORES', 'DESTINATARIOS', 'IDIOMA', 'RESUMEN', 'FIRMA', 'CAPTURISTA',
  'COTIZACIÓN', 'STATUS', 'ACUMULADO', 'FECHA ENVIO',
]

const COLUMN_WIDTHS = [
  18, 8, 28, 22, 10, 8, 14, 20, 18, 10, 20, 10, 10, 10, 10, 16, 16, 10,
  20, 22, 22, 30, 14, 20, 20, 20, 50, 8, 30, 8, 18, 28, 14, 12, 22,
]

// ─── Helpers de estilo ────────────────────────────────────────────────────────

function thinBorder(): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: COLORS.border } }
  return { top: side, left: side, right: side, bottom: side }
}

function applyHeaderStyle(row: ExcelJS.Row, colCount: number): void {
  row.height = 28
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c)
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.headerText } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }
    cell.border = thinBorder()
  }
}

function applyDataRowStyle(row: ExcelJS.Row, colCount: number, alt: boolean): void {
  row.height = 22
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c)
    cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1F2937' } }
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
    cell.border = thinBorder()
    if (alt) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rowAlt } }
    }
  }
}

function applyTotalsStyle(row: ExcelJS.Row, colCount: number): void {
  row.height = 24
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c)
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.totalsText } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalsBg } }
    cell.border = thinBorder()
  }
}

// ─── Builder ──────────────────────────────────────────────────────────────────

async function buildExcel(data: ExcelReporteData): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Quality Bolca'
  wb.created = new Date()

  // ═══ Hoja 1: Reporte (formato horizontal) ════════════════════════════════
  const wsReporte = wb.addWorksheet('Reporte', {
    views: [{ state: 'frozen', ySplit: 4, xSplit: 0 }],
  })

  wsReporte.columns = COLUMN_WIDTHS.map((wch) => ({ width: wch }))
  const lastColLetter = wsReporte.getColumn(HEADERS.length).letter

  // Fila 1: Título corporativo
  wsReporte.mergeCells(`A1:${lastColLetter}1`)
  const titleCell = wsReporte.getCell('A1')
  titleCell.value = 'QUALITY BOLCA'
  titleCell.font = { name: 'Calibri', size: 22, bold: true, color: { argb: 'FFFFFFFF' } }
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.brand } }
  wsReporte.getRow(1).height = 38

  // Fila 2: Subtítulo
  wsReporte.mergeCells(`A2:${lastColLetter}2`)
  const subtitleCell = wsReporte.getCell('A2')
  subtitleCell.value = `Reporte de Inspección · ${data.consecutiveNumber}`
  subtitleCell.font = { name: 'Calibri', size: 12, italic: true, color: { argb: COLORS.brand } }
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' }
  subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subTitleBg } }
  wsReporte.getRow(2).height = 24

  // Fila 3: separador en blanco (visual)
  wsReporte.getRow(3).height = 6

  // Fila 4: Headers
  const headerRow = wsReporte.addRow([])
  // Importante: addRow agregó fila 4 vacía. Ahora seteo headers en esa fila.
  HEADERS.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h
  })
  applyHeaderStyle(headerRow, HEADERS.length)

  // Una fila por ítem; si no hay ítems, una sola fila con totales agregados
  const buildItemRow = (item: (typeof data.items)[number] | null, idx: number) => [
    data.consecutiveNumber,                           // 0: NÚM DE REPORTE
    item ? String(idx + 1) : data.item,               // 1: ÍTEM
    data.planta,                                       // 2: PLANTA
    data.clienteCobro,                                 // 3: CLIENTE COBRO
    data.folio,                                        // 4: FOLIO
    data.turno,                                        // 5: TURNO
    data.reportDate,                                   // 6: FECHA
    data.numeroParte,                                  // 7: NÚMERO PARTE
    data.nombreParte,                                  // 8: NOMBRE PARTE
    data.columnA,                                      // 9: A
    item ? item.inspected  : data.totalInspected,      // 10: PZS. INSPECCIONADAS
    item ? item.ok         : data.totalOk,             // 11: OK
    item ? item.ng         : data.totalNg,             // 12: NG
    item ? item.recovered  : data.totalRecovered,      // 13: RECUP
    item ? item.scrap      : data.totalScrap,          // 14: SCRAP
    data.pzasXHr,                                      // 15: PZAS X HR (RATE)
    data.hrsEnReportes,                                // 16: HRS EN REPORTES
    data.tipoServicio,                                 // 17: T. SERV.
    data.reviso,                                       // 18: REVISÓ
    data.supervisor,                                   // 19: SUPERVISOR
    data.ingeniero,                                    // 20: INGENIERO
    item ? item.incidents : data.incidencias,          // 21: A)
    data.fechas,                                       // 22: FECHAS
    item ? item.series : data.series,                  // 23: SERIES
    item ? item.lote   : data.lotes,                   // 24: LOTES
    item ? item.otro   : '',                           // 25: IDENTIFICADORES
    data.destinatarios,                                // 26: DESTINATARIOS
    data.idioma,                                       // 27: IDIOMA
    data.resumen,                                      // 28: RESUMEN
    data.firma,                                        // 29: FIRMA
    data.capturista,                                   // 30: CAPTURISTA (vacío, lo llena el capturista)
    data.cotizacion,                                   // 31: COTIZACIÓN
    data.status,                                       // 32: STATUS
    data.acumulado,                                    // 33: ACUMULADO
    data.fechaEnvio,                                   // 34: FECHA ENVIO
  ]

  const itemsToRender = data.items.length > 0
    ? data.items
    : [null as unknown as (typeof data.items)[number]]
  itemsToRender.forEach((item, idx) => {
    const addedRow = wsReporte.addRow(buildItemRow(item, idx))
    applyDataRowStyle(addedRow, HEADERS.length, idx % 2 === 1)
  })

  // ═══ Hoja 2: Detalle Items ═══════════════════════════════════════════════
  if (data.items.length > 0) {
    const wsDetalle = wb.addWorksheet('Detalle Items', {
      views: [{ state: 'frozen', ySplit: 4, xSplit: 0 }],
    })

    const itemHeaders = [
      '#', 'Descripción', 'Lote', 'Series', 'Identificadores',
      'Inspeccionadas', 'OK', 'NG', 'Scrap', 'Recuperadas', 'Incidencias',
    ]
    const itemWidths = [4, 32, 14, 14, 14, 16, 10, 10, 10, 14, 40]
    wsDetalle.columns = itemWidths.map((wch) => ({ width: wch }))

    const lastDetColLetter = wsDetalle.getColumn(itemHeaders.length).letter

    // Título
    wsDetalle.mergeCells(`A1:${lastDetColLetter}1`)
    const dTitle = wsDetalle.getCell('A1')
    dTitle.value = 'QUALITY BOLCA'
    dTitle.font = { name: 'Calibri', size: 22, bold: true, color: { argb: 'FFFFFFFF' } }
    dTitle.alignment = { vertical: 'middle', horizontal: 'center' }
    dTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.brand } }
    wsDetalle.getRow(1).height = 38

    // Subtítulo
    wsDetalle.mergeCells(`A2:${lastDetColLetter}2`)
    const dSubtitle = wsDetalle.getCell('A2')
    dSubtitle.value = `Detalle de Ítems · ${data.consecutiveNumber}`
    dSubtitle.font = { name: 'Calibri', size: 12, italic: true, color: { argb: COLORS.brand } }
    dSubtitle.alignment = { vertical: 'middle', horizontal: 'center' }
    dSubtitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subTitleBg } }
    wsDetalle.getRow(2).height = 24
    wsDetalle.getRow(3).height = 6

    // Headers
    const dHeaderRow = wsDetalle.addRow([])
    itemHeaders.forEach((h, i) => {
      dHeaderRow.getCell(i + 1).value = h
    })
    applyHeaderStyle(dHeaderRow, itemHeaders.length)

    // Filas de items con alternancia
    data.items.forEach((item, idx) => {
      const r = wsDetalle.addRow([
        idx + 1, item.descripcion, item.lote, item.series, item.otro,
        item.inspected, item.ok, item.ng, item.scrap, item.recovered,
        item.incidents,
      ])
      applyDataRowStyle(r, itemHeaders.length, idx % 2 === 1)
      // Centrar columnas numéricas y el índice
      ;[1, 6, 7, 8, 9, 10].forEach((colIdx) => {
        r.getCell(colIdx).alignment = { vertical: 'middle', horizontal: 'center' }
      })
    })

    // Fila de totales
    const totalsRow = wsDetalle.addRow([
      'TOTAL', '', '', '', '',
      data.items.reduce((s, i) => s + i.inspected, 0),
      data.items.reduce((s, i) => s + i.ok, 0),
      data.items.reduce((s, i) => s + i.ng, 0),
      data.items.reduce((s, i) => s + i.scrap, 0),
      data.items.reduce((s, i) => s + i.recovered, 0),
      '',
    ])
    applyTotalsStyle(totalsRow, itemHeaders.length)
    // Merge "TOTAL" sobre las primeras 5 columnas para que destaque
    wsDetalle.mergeCells(`A${totalsRow.number}:E${totalsRow.number}`)
  }

  const arrayBuffer = await wb.xlsx.writeBuffer()
  // ExcelJS.Buffer is ArrayBuffer-backed; coerce to a plain ArrayBuffer slice so it
  // satisfies the Web `BodyInit` type (which requires ArrayBuffer, not ArrayBufferLike).
  return arrayBuffer as ArrayBuffer
}
