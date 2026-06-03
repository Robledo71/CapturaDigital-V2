// tests/unit/api/excel-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/back/services/session', () => ({ getSession: vi.fn() }))
vi.mock('@/back/services/publishedReportesService', () => ({ getReporteForExcel: vi.fn() }))
// ExcelJS genera el binario real — lo mockeamos para que el test sea unitario y rápido
vi.mock('exceljs', () => {
  const mockSheet = {
    addWorksheet: vi.fn().mockReturnValue({
      columns: [],
      mergeCells: vi.fn(),
      getCell: vi.fn().mockReturnValue({ value: null, font: {}, alignment: {}, fill: {}, border: {} }),
      getColumn: vi.fn().mockReturnValue({ letter: 'A' }),
      getRow: vi.fn().mockReturnValue({ height: 0, getCell: vi.fn().mockReturnValue({ value: null, font: {}, alignment: {}, fill: {}, border: {} }), number: 1 }),
      addRow: vi.fn().mockReturnValue({ height: 0, getCell: vi.fn().mockReturnValue({ value: null, font: {}, alignment: {}, fill: {}, border: {} }), number: 2 }),
    }),
  }
  const mockWorkbook = {
    creator: '',
    created: null,
    addWorksheet: mockSheet.addWorksheet,
    xlsx: { writeBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)) },
  }
  return { default: { Workbook: vi.fn(() => mockWorkbook) } }
})

import { getSession } from '@/back/services/session'
import { getReporteForExcel } from '@/back/services/publishedReportesService'
import { GET } from '@/app/api/capturacion/reportes/[id]/excel/route'

function makeSession(rol = 'capturacion') {
  return {
    userId: 1, rol, codigoEmpleado: 'CAP001',
    nombreCompleto: 'Capturista', accessToken: 'tok',
    refreshToken: 'ref', plantaId: null, plantaNombre: null,
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  }
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

const mockData = {
  consecutiveNumber: 'OV-001', item: '1', planta: 'Honda', clienteCobro: 'Bimbo',
  folio: 'F-01', turno: 'M', reportDate: '2026-01-15', numeroParte: 'PN-001',
  nombreParte: 'MAT', columnA: '', totalInspected: 100, totalOk: 95, totalNg: 5,
  totalRecovered: 2, totalScrap: 3, pzasXHr: '50', hrsEnReportes: '2',
  tipoServicio: 'Inspección', reviso: 'Juan', ingeniero: 'Pedro', incidencias: '',
  fechas: '', series: '', lotes: '', destinatarios: '', idioma: 'ES',
  resumen: '', firma: '', capturista: 'Ana', cotizacion: 'OV-001-CO-100',
  status: 'published', acumulado: '100', fechaEnvio: '2026-01-15',
  items: [],
}

describe('GET /api/capturacion/reportes/[id]/excel', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('sin sesión → 401 UNAUTHORIZED', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await GET(new Request('http://x'), makeParams('1'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('UNAUTHORIZED')
  })

  it('rol supervisor (no permitido) → 401', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('supervisor') as never)
    const res = await GET(new Request('http://x'), makeParams('1'))
    expect(res.status).toBe(401)
  })

  it('rol capturacion → permitido', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('capturacion') as never)
    vi.mocked(getReporteForExcel).mockResolvedValue(mockData as never)
    const res = await GET(new Request('http://x'), makeParams('42'))
    expect(res.status).toBe(200)
  })

  it('rol admin → permitido', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('admin') as never)
    vi.mocked(getReporteForExcel).mockResolvedValue(mockData as never)
    const res = await GET(new Request('http://x'), makeParams('42'))
    expect(res.status).toBe(200)
  })

  it('rol lider → permitido', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('lider') as never)
    vi.mocked(getReporteForExcel).mockResolvedValue(mockData as never)
    const res = await GET(new Request('http://x'), makeParams('42'))
    expect(res.status).toBe(200)
  })

  it('reporte no encontrado → 404 NOT_FOUND', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(getReporteForExcel).mockResolvedValue(null)
    const res = await GET(new Request('http://x'), makeParams('999'))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('NOT_FOUND')
  })

  it('respuesta exitosa tiene Content-Type de Excel', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(getReporteForExcel).mockResolvedValue(mockData as never)
    const res = await GET(new Request('http://x'), makeParams('42'))
    expect(res.headers.get('Content-Type')).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
  })

  it('respuesta exitosa tiene Content-Disposition con el id del reporte', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(getReporteForExcel).mockResolvedValue(mockData as never)
    const res = await GET(new Request('http://x'), makeParams('42'))
    expect(res.headers.get('Content-Disposition')).toContain('reporte-42.xlsx')
  })

  it('pasa el accessToken de la sesión a getReporteForExcel', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession() as never)
    vi.mocked(getReporteForExcel).mockResolvedValue(mockData as never)
    await GET(new Request('http://x'), makeParams('7'))
    expect(getReporteForExcel).toHaveBeenCalledWith('7', 'tok')
  })
})
