'server-only'

import { prisma } from '@/back/db/prisma'

export type SessionAssignment = {
  id: number
  tabletId: number
  tabletAlias: string
  operadores: string | null
  shift: number | null
  shiftLabel: string | undefined
  status: string
}

export type DailyReportWorkload = {
  id: number
  consecutiveNumber: string
  reportDate: Date
  status: string
  totalInspected: number
  quotationNumber: string | null
  sessions: SessionAssignment[]
}

export type OrderWorkload = {
  id: number
  consecutiveNumber: string
  clientName: string
  plantName: string
  plantId: number
  partNumber: string
  partName: string
  serviceType: string
  orderStatus: string
  dailyReports: DailyReportWorkload[]
}

export type TabletOption = {
  id: number
  alias: string
  serialNumber: string
  plantId: number | null
  plantName: string | null
  status: string
}

const SHIFT_LABEL: Record<number, string> = {
  1: 'Turno 1',
  2: 'Turno 2',
}

export async function getCargaDeTrabajoData(supervisorId: string): Promise<OrderWorkload[]> {
  const orders = await prisma.order.findMany({
    where: { supervisorId, status: 'abierta' },
    include: {
      client: true,
      plant: true,
      dailyReports: {
        include: {
          quotation: true,
          sessions: {
            include: { tablet: true },
            orderBy: { shift: 'asc' },
          },
        },
        orderBy: { reportDate: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return orders.map((order) => ({
    id: order.id,
    consecutiveNumber: order.consecutiveNumber,
    clientName: order.client.name,
    plantName: order.plant.name,
    plantId: order.plantId,
    partNumber: order.partNumber ?? '-',
    partName: order.partName ?? '-',
    serviceType: order.serviceType ?? '-',
    orderStatus: order.status,
    dailyReports: order.dailyReports.map((report) => ({
      id: report.id,
      consecutiveNumber: report.consecutiveNumber,
      reportDate: report.reportDate,
      status: report.status,
      totalInspected: Number(report.totalInspected),
      quotationNumber: report.quotation?.consecutiveNumber ?? null,
      sessions: report.sessions.map((session) => ({
        id: session.id,
        tabletId: session.tabletId,
        tabletAlias: session.tablet.alias ?? session.tablet.serialNumber,
        operadores: session.operadores,
        shift: session.shift,
        shiftLabel: session.shift != null ? (SHIFT_LABEL[session.shift] ?? `Turno ${session.shift}`) : undefined,
        status: session.status,
      })),
    })),
  }))
}

export async function getAvailableTablets(): Promise<TabletOption[]> {
  const tablets = await prisma.tablet.findMany({
    where: { status: 'activa' },
    include: { plant: true },
    orderBy: [{ alias: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
  })

  return tablets.map((t) => ({
    id: t.id,
    alias: t.alias ?? t.serialNumber,
    serialNumber: t.serialNumber,
    plantId: t.plantId ?? null,
    plantName: t.plant?.name ?? null,
    status: t.status,
  }))
}
