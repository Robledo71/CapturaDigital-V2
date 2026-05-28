import * as xlsx from 'xlsx'
import { getSession } from '@/back/services/session'
import { getReporteForExcel, type ExcelReporteData } from '@/back/services/publishedReportesService'

const ALLOWED_ROLES = new Set(['capturacion', 'admin', 'lider'] as const)

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getSession()

  if (!session || !ALLOWED_ROLES.has(session.rol as (typeof ALLOWED_ROLES extends Set<infer T> ? T : never))) {
    return Response.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id } = await params
  const reportId = decodeURIComponent(id)

  const data = await getReporteForExcel(reportId, session.accessToken)

  if (!data) {
    return Response.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 })
  }

  const buffer = buildExcel(data)

  return new Response(buffer.buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="reporte-${reportId}.xlsx"`,
    },
  })
}

// ─── Encabezados del formato horizontal ───────────────────────────────────────

const HEADERS = [
  'NÚM DE REPORTE',
  'ÍTEM',
  'PLANTA',
  'CLIENTE COBRO',
  'FOLIO',
  'TURNO',
  'FECHA',
  'NÚMERO PARTE',
  'NOMBRE PARTE',
  'A',
  'PZS. INSPECCIONADAS',
  'OK',
  'NG',
  'RECUP',
  'SCRAP',
  'PZAS X HR (RATE)',
  'HRS EN REPORTES',
  'T. SERV.',
  'REVISÓ',
  'INGENIERO',
  'A)',
  'FECHAS',
  'SERIES',
  'LOTES',
  'DESTINATARIOS',
  'IDIOMA',
  'RESUMEN',
  'FIRMA',
  'CAPTURISTA',
  'COTIZACIÓN',
  'STATUS',
  'ACUMULADO',
  'FECHA ENVIO',
]

function buildExcel(data: ExcelReporteData): Uint8Array {
  const wb = xlsx.utils.book_new()

  // ── Hoja principal: una fila por reporte (formato horizontal) ──
  const dataRow = [
    data.consecutiveNumber,
    data.item,
    data.planta,
    data.clienteCobro,
    data.folio,
    data.turno,
    data.reportDate,
    data.numeroParte,
    data.nombreParte,
    data.columnA,
    data.totalInspected,
    data.totalOk,
    data.totalNg,
    data.totalRecovered,
    data.totalScrap,
    data.pzasXHr,
    data.hrsEnReportes,
    data.tipoServicio,
    data.reviso,
    data.ingeniero,
    data.incidencias,
    data.fechas,
    data.series,
    data.lotes,
    data.destinatarios,
    data.idioma,
    data.resumen,
    data.firma,
    data.capturista,
    data.cotizacion,
    data.status,
    data.acumulado,
    data.fechaEnvio,
  ]

  const wsReporte = xlsx.utils.aoa_to_sheet([HEADERS, dataRow])

  wsReporte['!cols'] = [
    { wch: 18 }, // NÚM DE REPORTE
    { wch: 8  }, // ÍTEM
    { wch: 28 }, // PLANTA
    { wch: 22 }, // CLIENTE COBRO
    { wch: 10 }, // FOLIO
    { wch: 8  }, // TURNO
    { wch: 14 }, // FECHA
    { wch: 20 }, // NÚMERO PARTE
    { wch: 18 }, // NOMBRE PARTE
    { wch: 10 }, // A
    { wch: 20 }, // PZS. INSPECCIONADAS
    { wch: 10 }, // OK
    { wch: 10 }, // NG
    { wch: 10 }, // RECUP
    { wch: 10 }, // SCRAP
    { wch: 16 }, // PZAS X HR (RATE)
    { wch: 16 }, // HRS EN REPORTES
    { wch: 10 }, // T. SERV.
    { wch: 20 }, // REVISÓ
    { wch: 22 }, // INGENIERO
    { wch: 30 }, // A)
    { wch: 14 }, // FECHAS
    { wch: 20 }, // SERIES
    { wch: 20 }, // LOTES
    { wch: 50 }, // DESTINATARIOS
    { wch: 8  }, // IDIOMA
    { wch: 30 }, // RESUMEN
    { wch: 8  }, // FIRMA
    { wch: 18 }, // CAPTURISTA
    { wch: 28 }, // COTIZACIÓN
    { wch: 14 }, // STATUS
    { wch: 12 }, // ACUMULADO
    { wch: 22 }, // FECHA ENVIO
  ]

  applyBoldRow(wsReporte, 0, HEADERS.length)
  xlsx.utils.book_append_sheet(wb, wsReporte, 'Reporte')

  // ── Hoja secundaria: detalle de ítems ──
  if (data.items.length > 0) {
    const itemHeaders = [
      '#', 'Descripción', 'Lote', 'Series', 'Otro',
      'Inspeccionadas', 'OK', 'NG', 'Scrap', 'Recuperadas', 'Incidencias',
    ]

    const itemRows = data.items.map((item, idx) => [
      idx + 1,
      item.descripcion,
      item.lote,
      item.series,
      item.otro,
      item.inspected,
      item.ok,
      item.ng,
      item.scrap,
      item.recovered,
      item.incidents,
    ])

    const totalsRow = [
      'TOTAL', '', '', '', '',
      data.items.reduce((s, i) => s + i.inspected, 0),
      data.items.reduce((s, i) => s + i.ok, 0),
      data.items.reduce((s, i) => s + i.ng, 0),
      data.items.reduce((s, i) => s + i.scrap, 0),
      data.items.reduce((s, i) => s + i.recovered, 0),
      '',
    ]

    const wsDetalle = xlsx.utils.aoa_to_sheet([itemHeaders, ...itemRows, totalsRow])
    wsDetalle['!cols'] = [
      { wch: 4  }, { wch: 32 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 40 },
    ]
    applyBoldRow(wsDetalle, 0, itemHeaders.length)
    applyBoldRow(wsDetalle, itemRows.length + 1, itemHeaders.length)
    xlsx.utils.book_append_sheet(wb, wsDetalle, 'Detalle Items')
  }

  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Uint8Array
}

function applyBoldRow(ws: xlsx.WorkSheet, rowIndex: number, colCount: number): void {
  for (let c = 0; c < colCount; c++) {
    const cellAddress = xlsx.utils.encode_cell({ r: rowIndex, c })
    if (!ws[cellAddress]) continue
    ws[cellAddress].s = { font: { bold: true } }
  }
}
