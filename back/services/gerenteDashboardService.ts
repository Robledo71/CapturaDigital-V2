import 'server-only'

const BASE = () => process.env.QSYNC_API_URL ?? 'http://localhost:3001'

function apiHeaders(accessToken: string): Record<string, string> {
  return {
    'X-App-Token': process.env.X_APP_TOKEN ?? '',
    Authorization: `Bearer ${accessToken}`,
  }
}

// ─── Response contract types ──────────────────────────────────────────────────

export type GerenteTotals = {
  ordenesActivas: number
  reportesTotales: number
  pendientesRevision: number
  publicados: number
}

export type ReportePorEstado = {
  estado: 'submitted' | 'sampled' | 'signed' | 'published'
  cantidad: number
}

export type GerentePiezas = {
  ok: number
  ng: number
  scrap: number
  recovered: number
  totalInspeccionadas: number
  pctNG: number
}

export type PlantaResumen = {
  plantName: string
  ordenes: number
  reportes: number
}

export type ReporteEnTiempo = {
  mes: string   // 'YYYY-MM'
  recibidos: number
}

export type NgPorPlanta = {
  plantName: string
  pctNG: number  // 0..1
  totalInspeccionadas: number
}

export type TopCliente = {
  clientName: string
  piezas: number
  reportes: number
}

export type GerenteDashboardData = {
  totals: GerenteTotals
  reportesPorEstado: ReportePorEstado[]
  piezas: GerentePiezas
  porPlanta: PlantaResumen[]
  reportesEnTiempo: ReporteEnTiempo[]
  ngPorPlanta: NgPorPlanta[]
  topClientes: TopCliente[]
}

// ─── Safe empty fallback ──────────────────────────────────────────────────────

function emptyDashboard(): GerenteDashboardData {
  return {
    totals: {
      ordenesActivas: 0,
      reportesTotales: 0,
      pendientesRevision: 0,
      publicados: 0,
    },
    reportesPorEstado: [],
    piezas: {
      ok: 0,
      ng: 0,
      scrap: 0,
      recovered: 0,
      totalInspeccionadas: 0,
      pctNG: 0,
    },
    porPlanta: [],
    reportesEnTiempo: [],
    ngPorPlanta: [],
    topClientes: [],
  }
}

// ─── Service function ─────────────────────────────────────────────────────────

export async function getGerenteDashboard(
  accessToken: string,
): Promise<GerenteDashboardData> {
  try {
    const res = await fetch(`${BASE()}/qb_sync/dashboard/gerente`, {
      cache: 'no-store',
      headers: apiHeaders(accessToken),
    })
    if (!res.ok) {
      // No silenciar: un 404 suele significar que qb_sync no tiene desplegada la ruta;
      // 403 que el rol no está autorizado; 500 un error real del endpoint.
      console.error(
        `[gerenteDashboard] qb_sync respondió ${res.status} ${res.statusText} en /qb_sync/dashboard/gerente`,
      )
      return emptyDashboard()
    }
    const json = await res.json()
    const data = json?.data
    if (!data) return emptyDashboard()
    return {
      totals: {
        ordenesActivas:    data.totals?.ordenesActivas    ?? 0,
        reportesTotales:   data.totals?.reportesTotales   ?? 0,
        pendientesRevision: data.totals?.pendientesRevision ?? 0,
        publicados:        data.totals?.publicados        ?? 0,
      },
      reportesPorEstado: Array.isArray(data.reportesPorEstado)
        ? data.reportesPorEstado
        : [],
      piezas: {
        ok:                data.piezas?.ok                ?? 0,
        ng:                data.piezas?.ng                ?? 0,
        scrap:             data.piezas?.scrap             ?? 0,
        recovered:         data.piezas?.recovered         ?? 0,
        totalInspeccionadas: data.piezas?.totalInspeccionadas ?? 0,
        pctNG:             data.piezas?.pctNG             ?? 0,
      },
      porPlanta: Array.isArray(data.porPlanta) ? data.porPlanta : [],
      reportesEnTiempo: Array.isArray(data.reportesEnTiempo) ? data.reportesEnTiempo : [],
      ngPorPlanta:      Array.isArray(data.ngPorPlanta)      ? data.ngPorPlanta      : [],
      topClientes:      Array.isArray(data.topClientes)      ? data.topClientes      : [],
    }
  } catch (err) {
    console.error('[gerenteDashboard] fallo al consultar qb_sync', err)
    return emptyDashboard()
  }
}
