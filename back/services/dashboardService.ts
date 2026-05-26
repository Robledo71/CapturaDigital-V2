// TODO Fase 3: rehacer con daily_report_items y nuevo esquema. Funciones stubbeadas.
'server-only'

export type DashboardStats = {
  pendientesEnPiso: number
  esperanRevision: number
  publicadosHoy: number
  pctNGSemana: string
}

export async function getSupervisorDashboardStats(_supervisorId: string): Promise<DashboardStats> {
  return {
    pendientesEnPiso: 0,
    esperanRevision: 0,
    publicadosHoy: 0,
    pctNGSemana: '0.00%',
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

export async function getDashboardBandeja(_supervisorId: string): Promise<BandejaReporteRow[]> {
  return []
}

export type ProduccionItem = {
  operadores: string
  initials: string
  report: string
  status: 'Pendiente' | 'Enviado'
  current: number
  total: number
}

export async function getDashboardProduccion(_supervisorId: string): Promise<ProduccionItem[]> {
  return []
}
