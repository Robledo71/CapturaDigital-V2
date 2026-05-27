import 'server-only'

import { prisma } from '@/back/db/prisma'

export type ReporteEstatus = 'Pendiente' | 'Enviado' | 'En muestreo' | 'Firmado' | 'Publicado'

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

function mapEstatus(dbStatus: string, hasItems: boolean): ReporteEstatus {
  if (dbStatus === 'pendiente') return hasItems ? 'Enviado' : 'Pendiente'
  if (dbStatus === 'muestreado') return 'En muestreo'
  if (dbStatus === 'firmado') return 'Firmado'
  if (dbStatus === 'publicado') return 'Publicado'
  return 'Pendiente'
}

export async function getUnassignedCount(): Promise<number> {
  return 0
}

export async function getSupervisorReportes(
  _supervisorId: string,
  mode: 'assigned' | 'unassigned' = 'assigned',
  page: number = 1,
): Promise<ReportesResult> {
  if (mode === 'unassigned') return { rows: [], total: 0 }

  const skip = (page - 1) * PAGE_SIZE

  const [reports, total] = await prisma.$transaction([
    prisma.dailyReport.findMany({
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
    }),
    prisma.dailyReport.count(),
  ])

  const rows: ReporteRow[] = reports.map((report) => {
    const quotation = report.orderItem.quotation
    const order = quotation.order
    const plant = order.plant

    const totalPieces = report.items.reduce((s, i) => s + (i.totalPieces ?? 0), 0)
    const totalNg = report.items.reduce((s, i) => s + (i.ngPieces ?? 0), 0)

    return {
      id: String(report.id),
      orderId: order.id,
      cliente: order.clientName ?? '—',
      planta: plant?.name ?? '—',
      cotizacion: quotation.consecutiveNumber ?? '—',
      parte: report.orderItem.partNumber ?? '—',
      inspector: report.operators[0]?.operatorName ?? '—',
      turno: report.shift ?? '—',
      estatus: mapEstatus(report.status, report.items.length > 0),
      piezas: totalPieces.toLocaleString('es-MX'),
      pctNG: totalPieces > 0 ? `${((totalNg / totalPieces) * 100).toFixed(1)}%` : '-',
    }
  })

  return { rows, total }
}
