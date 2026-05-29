import 'server-only'

import { prisma } from '@/back/db/prisma'

export type ReporteEstatus = 'Enviado' | 'En muestreo' | 'Firmado' | 'Publicado'

export type ReporteRow = {
  id: string
  orderId: number
  cliente: string
  planta: string
  cotizacion: string
  parte: string
  inspector: string
  turno: string
  estatus: ReporteEstatus
  piezas: string
  pctNG: string
}

export type ReportesResult = {
  rows: ReporteRow[]
  total: number
}

export const PAGE_SIZE = 20

function mapEstatus(dbStatus: string): ReporteEstatus {
  // DB stores English values: submitted, sampled, signed, published
  if (dbStatus === 'submitted') return 'Enviado'
  if (dbStatus === 'sampled'   || dbStatus === 'muestreado') return 'En muestreo'
  if (dbStatus === 'signed'    || dbStatus === 'firmado')    return 'Firmado'
  if (dbStatus === 'published' || dbStatus === 'publicado')  return 'Publicado'
  // Any unknown value defaults to Enviado — Pendiente no longer exists
  return 'Enviado'
}

export async function getSupervisorReportes(
  _supervisorId: string,
  page: number = 1,
): Promise<ReportesResult> {
  const skip = (page - 1) * PAGE_SIZE

  const { reports, total } = await prisma.$transaction(async (tx) => {
    const reports = await tx.dailyReport.findMany({
      include: {
        items: {
          select: { totalPieces: true, ngPieces: true },
        },
        operators: {
          take: 1,
          select: { operatorName: true },
        },
        orderItem: {
          include: {
            quotation: {
              include: {
                order: {
                  include: {
                    plant: {
                      select: { name: true },
                    },
                    client: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { reportDate: 'desc' },
      skip,
      take: PAGE_SIZE,
    })
    const total = await tx.dailyReport.count()
    return { reports, total }
  })

  const rows: ReporteRow[] = reports.map((report) => {
    const quotation = report.orderItem.quotation
    const order = quotation.order
    const plant = order.plant

    const totalPieces = report.items.reduce((s, i) => s + (i.totalPieces ?? 0), 0)
    const totalNg = report.items.reduce((s, i) => s + (i.ngPieces ?? 0), 0)

    return {
      id: String(report.id),
      orderId: order.id,
      cliente: order.client?.name ?? '—',
      planta: plant?.name ?? '—',
      cotizacion: quotation.consecutiveNumber ?? '—',
      parte: report.orderItem.partNumber ?? '—',
      inspector: report.operators[0]?.operatorName ?? '—',
      turno: report.shift ?? '—',
      estatus: mapEstatus(report.status),
      piezas: totalPieces.toLocaleString('es-MX'),
      pctNG: totalPieces > 0 ? `${((totalNg / totalPieces) * 100).toFixed(1)}%` : '-',
    }
  })

  return { rows, total }
}
