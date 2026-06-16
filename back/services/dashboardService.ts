import 'server-only'

const BASE = () => process.env.QSYNC_API_URL ?? 'http://localhost:3001'

function getInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('')
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'hace un momento'
  if (minutes < 60) return `hace ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `hace ${days}d`
}

export type DashboardStats = {
  pendientesEnPiso: number
  esperanRevision: number
  publicadosHoy: number
  pctNGSemana: string
}

export async function getSupervisorDashboardStats(accessToken: string): Promise<DashboardStats> {
  try {
    const res = await fetch(`${BASE()}/qb_sync/daily-reports/dashboard`, {
      cache: 'no-store',
      headers: {
        'X-App-Token': process.env.X_APP_TOKEN ?? '',
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (!res.ok) return { pendientesEnPiso: 0, esperanRevision: 0, publicadosHoy: 0, pctNGSemana: '0.00%' }
    const json = await res.json()
    const stats = json?.data?.stats
    return {
      pendientesEnPiso: stats?.pendientes_en_piso ?? 0,
      esperanRevision: stats?.espera_revision ?? 0,
      publicadosHoy: stats?.publicados_hoy ?? 0,
      pctNGSemana: `${parseFloat(stats?.pct_ng_semana ?? '0').toFixed(2)}%`,
    }
  } catch {
    return { pendientesEnPiso: 0, esperanRevision: 0, publicadosHoy: 0, pctNGSemana: '0.00%' }
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

export async function getDashboardBandeja(accessToken: string): Promise<BandejaReporteRow[]> {
  try {
    const res = await fetch(`${BASE()}/qb_sync/daily-reports/dashboard`, {
      cache: 'no-store',
      headers: {
        'X-App-Token': process.env.X_APP_TOKEN ?? '',
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (!res.ok) return []
    const json = await res.json()
    const bandeja: Array<{
      id: number
      created_at: string
      part_number: string
      client_name: string
      plant_name: string
      operadores: string
    }> = json?.data?.bandeja ?? []
    return [...bandeja]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6)
      .map((row) => ({
        id: String(row.id),
        part: row.part_number,
        client: row.client_name,
        plant: row.plant_name,
        operadores: row.operadores,
        initials: getInitials(row.operadores),
        time: timeAgo(row.created_at),
      }))
  } catch {
    return []
  }
}

export type ProduccionItem = {
  operadores: string
  initials: string
  report: string
  tabletCode: string
  status: 'Pendiente' | 'Enviado'
  current: number
  total: number
}

export async function getDashboardProduccion(accessToken: string): Promise<ProduccionItem[]> {
  try {
    const res = await fetch(`${BASE()}/qb_sync/daily-reports/live-production`, {
      cache: 'no-store',
      headers: {
        'X-App-Token': process.env.X_APP_TOKEN ?? '',
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (!res.ok) return []
    const json = await res.json()
    const sessions: Array<{
      inspector_name: string
      quotation_consecutive: string
      id_tablet: string | null
      has_submitted_report: boolean
      inventory_done: number
      inventory: number
    }> = json?.data ?? []
    return sessions.map((s) => ({
      operadores: s.inspector_name,
      initials: getInitials(s.inspector_name),
      report: s.quotation_consecutive,
      tabletCode: s.id_tablet ?? '—',
      status: s.has_submitted_report ? 'Enviado' : 'Pendiente',
      current: s.inventory_done,
      total: s.inventory,
    }))
  } catch {
    return []
  }
}
