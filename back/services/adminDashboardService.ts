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
  id: string
  nombreCompleto: string
  codigoEmpleado: string
  rol: string
  planta: string
  isActive: boolean
}

export type AdminDashboardData = {
  stats: AdminDashboardStats
  recentUsuarios: AdminRecentUsuario[]
}

// ─── Service ──────────────────────────────────────────────────────────────────

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    usuariosActivos,
    desgloseRol,
    totalClientes,
    plantasActivas,
    tabletsStats,
    reportesPendientes,
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

    // Total clientes
    prisma.client.count(),

    // Plantas que tienen al menos una orden abierta
    prisma.plant.count({
      where: {
        orders: { some: { status: 'abierta' } },
      },
    }),

    // Tablets agrupadas por estado
    prisma.tablet.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),

    // Reportes diarios pendientes de hoy en adelante
    prisma.dailyReport.count({
      where: {
        status: 'pending',
        reportDate: { gte: today },
      },
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
        planta: true,
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
    totalClientes,
    plantasActivas,
    tabletsRegistradas: tabletsTotal,
    reportesPendientes,
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
      planta: u.planta,
      isActive: u.isActive,
    })),
  }
}
