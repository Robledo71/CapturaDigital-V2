'server-only'

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

const STATUS_MAP: Record<string, ReporteEstatus> = {
  pending: 'Pendiente',
  submitted: 'Enviado',
  sampling: 'En muestreo',
  signed: 'Firmado',
  published: 'Publicado',
}

const SHIFT_MAP: Record<number, string> = {
  1: 'Turno 1',
  2: 'Turno 2',
}

export async function getUnassignedCount(): Promise<number> {
  return prisma.dailyReport.count({
    where: { order: { is: { supervisorId: null } } },
  })
}

export async function getSupervisorReportes(
  supervisorId: string,
  mode: 'assigned' | 'unassigned' = 'assigned',
  page: number = 1,
): Promise<ReportesResult> {
  const where =
    mode === 'unassigned'
      ? { order: { is: { supervisorId: null } } }
      : { order: { is: { supervisorId } } }

  const skip = (page - 1) * PAGE_SIZE

  const [reports, total] = await Promise.all([
    prisma.dailyReport.findMany({
      where,
      include: {
        order: { include: { client: true, plant: true } },
        quotation: true,
        sessions: {
          include: { items: true },
          orderBy: { shift: 'asc' },
          take: 1,
        },
      },
      orderBy: { reportDate: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.dailyReport.count({ where }),
  ])

  const rows = reports.map((r) => {
    const firstSession = r.sessions[0]
    const totalInspected = Number(r.totalInspected)
    const totalNg = Number(r.totalNg)

    const piezas =
      totalInspected > 0 ? Number(r.totalInspected).toLocaleString('es-MX') : '—'

    const pctNG =
      totalInspected > 0
        ? ((totalNg / totalInspected) * 100).toFixed(2) + '%'
        : '—'

    return {
      id: r.consecutiveNumber,
      orderId: r.order.id,
      cliente: r.order.client.name,
      planta: r.order.plant.name,
      cotizacion: r.quotation?.consecutiveNumber ?? r.order.consecutiveNumber,
      parte: r.order.partNumber ?? '—',
      inspector: firstSession?.operadores ?? '—',
      turno: firstSession?.shift != null ? (SHIFT_MAP[firstSession.shift] ?? '—') : '—',
      estatus: STATUS_MAP[r.status] ?? 'Pendiente',
      piezas,
      pctNG,
    }
  })

  return { rows, total }
}
