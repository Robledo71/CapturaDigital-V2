'server-only'

import { prisma } from '@/back/db/prisma'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdminDashboardStats = {
  usuariosActivos: number
  totalClientes: number
  plantasActivas: number
  tabletsRegistradas: number
  reportesPendientes: number
  tabletsActivas: number
  desglosePorRol: {
    admin: number
    supervisor: number
    capturacion: number
    lider: number
  }
}

export type AdminRecentUsuario = {
  id: number
  nombreCompleto: string
  codigoEmpleado: string
  rol: string
  plant: { name: string } | null
  isActive: boolean
}

export type AdminDashboardData = {
  stats: AdminDashboardStats
  recentUsuarios: AdminRecentUsuario[]
}

// ─── Service ──────────────────────────────────────────────────────────────────

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [
    usuariosActivos,
    desgloseRol,
    plantasActivas,
    tabletsStats,
    recentUsuarios,
  ] = await Promise.all([
    // Total usuarios activos
    prisma.usuario.count({ where: { isActive: true } }),

    // Desglose por rol (solo activos)
    prisma.usuario.groupBy({
      by: ['rol'],
      where: { isActive: true },
      _count: { _all: true },
    }),

    // Plantas registradas
    prisma.plant.count(),

    // Tablets agrupadas por estado
    prisma.tablet.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),

    // Ultimos 10 usuarios creados
    prisma.usuario.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        nombreCompleto: true,
        codigoEmpleado: true,
        rol: true,
        plant: { select: { name: true } },
        isActive: true,
      },
    }),
  ])

  // Build role breakdown map
  const rolMap: Record<string, number> = {}
  for (const row of desgloseRol) {
    rolMap[row.rol] = row._count._all
  }

  // Build tablet counts from grouped result
  let tabletsTotal = 0
  let tabletsActivas = 0
  for (const row of tabletsStats) {
    tabletsTotal += row._count._all
    if (row.status === 'activa') {
      tabletsActivas = row._count._all
    }
  }

  const stats: AdminDashboardStats = {
    usuariosActivos,
    totalClientes: 0, // TODO Fase 4: Client model eliminado del esquema
    plantasActivas,
    tabletsRegistradas: tabletsTotal,
    reportesPendientes: 0, // TODO Fase 3: rehacer con nuevo esquema de DailyReport
    tabletsActivas,
    desglosePorRol: {
      admin: rolMap['admin'] ?? 0,
      supervisor: rolMap['supervisor'] ?? 0,
      capturacion: rolMap['capturacion'] ?? 0,
      lider: rolMap['lider'] ?? 0,
    },
  }

  return {
    stats,
    recentUsuarios: recentUsuarios.map((u) => ({
      id: u.id,
      nombreCompleto: u.nombreCompleto,
      codigoEmpleado: u.codigoEmpleado,
      rol: u.rol,
      plant: u.plant,
      isActive: u.isActive,
    })),
  }
}
