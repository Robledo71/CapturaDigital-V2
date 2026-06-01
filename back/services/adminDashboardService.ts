import 'server-only'

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

// ─── Raw shape from qb_sync ───────────────────────────────────────────────────

interface RawUsuarioReciente {
  id: number
  nombre_completo: string
  codigo_empleado: string
  correo: string
  rol: string
  puesto: string | null
  is_active: boolean
  created_at: string
}

interface RawAdminDashboard {
  usuariosActivos: number
  porRol: Record<string, number>
  totalPlantas: number
  totalTablets: number
  usuariosRecientes: RawUsuarioReciente[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function apiHeaders(accessToken: string): Record<string, string> {
  return {
    'X-App-Token': process.env.X_APP_TOKEN ?? '',
    Authorization: `Bearer ${accessToken}`,
  }
}

const BASE = () => process.env.QSYNC_API_URL ?? 'http://localhost:3001'

// ─── Service ──────────────────────────────────────────────────────────────────

export async function getAdminDashboardData(accessToken: string): Promise<AdminDashboardData> {
  const res = await fetch(`${BASE()}/qb_sync/users/admin-dashboard`, {
    headers: apiHeaders(accessToken),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`getAdminDashboardData failed: ${res.status}`)

  const body = await res.json() as { success: boolean; data: RawAdminDashboard }
  const raw = body.data

  const porRol = raw.porRol ?? {}

  const stats: AdminDashboardStats = {
    usuariosActivos: raw.usuariosActivos ?? 0,
    totalClientes: 0,          // TODO Fase 4: no disponible en este endpoint
    plantasActivas: raw.totalPlantas ?? 0,
    tabletsRegistradas: raw.totalTablets ?? 0,
    reportesPendientes: 0,     // TODO Fase 3: no disponible en este endpoint
    tabletsActivas: 0,         // TODO: endpoint no devuelve desglose activa/total
    desglosePorRol: {
      admin: porRol['admin'] ?? 0,
      supervisor: porRol['supervisor'] ?? 0,
      capturacion: porRol['capturacion'] ?? 0,
      lider: porRol['lider'] ?? 0,
    },
  }

  const recentUsuarios: AdminRecentUsuario[] = (raw.usuariosRecientes ?? []).map((u) => ({
    id: u.id,
    nombreCompleto: u.nombre_completo,
    codigoEmpleado: u.codigo_empleado,
    rol: u.rol,
    plant: null, // endpoint no devuelve planta por usuario en este resumen
    isActive: u.is_active,
  }))

  return { stats, recentUsuarios }
}
