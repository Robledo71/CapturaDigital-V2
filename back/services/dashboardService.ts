'server-only'

import { prisma } from '@/back/db/prisma'

export type DashboardStats = {
  pendientesEnPiso: number
  esperanRevision: number
  publicadosHoy: number
  pctNGSemana: string
}

export async function getSupervisorDashboardStats(supervisorId: string): Promise<DashboardStats> {
  const now = new Date()

  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const startOfTomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))

  // Monday of the current ISO week (UTC)
  const dayOfWeek = now.getUTCDay() // 0 = Sunday
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const startOfWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMonday))

  const [pendientesEnPiso, esperanRevision, publicadosHoy, ngAggregate] = await Promise.all([
    prisma.dailyReport.count({
      where: { order: { supervisorId }, status: 'pending' },
    }),
    prisma.dailyReport.count({
      where: { order: { supervisorId }, status: 'submitted' },
    }),
    prisma.dailyReport.count({
      where: {
        order: { supervisorId },
        status: 'published',
        reportDate: { gte: startOfToday, lt: startOfTomorrow },
      },
    }),
    prisma.inspectionItem.aggregate({
      _sum: { ng: true, inspected: true },
      where: {
        session: {
          dailyReport: {
            order: { supervisorId },
            reportDate: { gte: startOfWeek },
          },
        },
      },
    }),
  ])

  const totalInspected = Number(ngAggregate._sum.inspected ?? 0)
  const totalNG = Number(ngAggregate._sum.ng ?? 0)
  const pctNGSemana =
    totalInspected === 0 ? '0.00%' : ((totalNG / totalInspected) * 100).toFixed(2) + '%'

  return {
    pendientesEnPiso,
    esperanRevision,
    publicadosHoy,
    pctNGSemana,
  }
}

export type BandejaReporteRow = {
  id: string
  part: string
  client: string
  plant: string
  operadores: string
  initials: string
  time: string
}

function getInitials(operadores: string | undefined): string {
  if (!operadores) return '?'
  const first = operadores.split(',')[0].trim()
  const words = first.trim().split(/\s+/)
  return (
    words
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

export async function getDashboardBandeja(supervisorId: string): Promise<BandejaReporteRow[]> {
  const reports = await prisma.dailyReport.findMany({
    where: {
      order: { supervisorId },
      status: { in: ['pending', 'submitted'] },
    },
    include: {
      order: { include: { client: true, plant: true } },
      sessions: { orderBy: { shift: 'asc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const todayMidnight = new Date()
  todayMidnight.setHours(0, 0, 0, 0)

  return reports.map((r) => {
    const operadoresRaw = r.sessions[0]?.operadores ?? ''
    const operadores = operadoresRaw || '—'

    const isToday = r.createdAt >= todayMidnight
    const time = isToday
      ? r.createdAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      : r.createdAt.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })

    return {
      id: r.consecutiveNumber,
      part: r.order.partNumber ?? '—',
      client: r.order.client.name,
      plant: r.order.plant.name,
      operadores,
      initials: getInitials(operadoresRaw),
      time,
    }
  })
}

export type ProduccionItem = {
  operadores: string
  initials: string
  report: string
  status: 'Pendiente' | 'Enviado'
  current: number
  total: number
}

export async function getDashboardProduccion(supervisorId: string): Promise<ProduccionItem[]> {
  const sessions = await prisma.inspectionSession.findMany({
    where: {
      dailyReport: {
        order: { supervisorId },
        status: { in: ['pending', 'submitted'] },
      },
    },
    include: {
      items: { select: { inspected: true } },
      dailyReport: { select: { consecutiveNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 6,
  })

  return sessions.map((session) => {
    const current = session.items.reduce((sum, i) => sum + Number(i.inspected), 0)
    const total = session.status === 'in_progress' ? 0 : current
    const status: 'Pendiente' | 'Enviado' = session.status === 'in_progress' ? 'Pendiente' : 'Enviado'

    return {
      operadores: session.operadores ?? '—',
      initials: getInitials(session.operadores ?? undefined),
      report: session.dailyReport.consecutiveNumber,
      status,
      current,
      total,
    }
  })
}
