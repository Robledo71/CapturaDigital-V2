import 'server-only'

export type ReporteEstatus = 'Enviado' | 'En muestreo' | 'Firmado' | 'Publicado'

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

function mapEstatus(dbStatus: string): ReporteEstatus {
  // DB stores English values: submitted, sampled, signed, published
  if (dbStatus === 'submitted') return 'Enviado'
  if (dbStatus === 'sampled'   || dbStatus === 'muestreado') return 'En muestreo'
  if (dbStatus === 'signed'    || dbStatus === 'firmado')    return 'Firmado'
  if (dbStatus === 'published' || dbStatus === 'publicado')  return 'Publicado'
  // Any unknown value defaults to Enviado — Pendiente no longer exists
  return 'Enviado'
}

function apiHeaders(accessToken: string): Record<string, string> {
  return {
    'X-App-Token': process.env.X_APP_TOKEN ?? '',
    Authorization: `Bearer ${accessToken}`,
  }
}

const BASE = () => process.env.QSYNC_API_URL ?? 'http://localhost:3001'

export async function getSupervisorReportes(
  _supervisorId: string,
  accessToken: string,
): Promise<ReportesResult> {
  // Trae TODOS los reportes de una sola vez; la paginación se maneja en el cliente.
  const res = await fetch(
    `${BASE()}/qb_sync/daily-reports/admin-list`,
    {
      headers: apiHeaders(accessToken),
      cache: 'no-store',
    },
  )
  if (!res.ok) throw new Error(`getSupervisorReportes failed: ${res.status}`)

  const body = await res.json() as {
    success: boolean
    data: { rows: unknown[]; total: number }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: ReporteRow[] = (body.data.rows ?? []).map((r: any) => {
    const totalPieces = Number(r.total_pieces ?? 0)
    const totalNg = Number(r.total_ng ?? 0)
    return {
      id: String(r.id),
      orderId: Number(r.order_id),
      cliente: r.cliente ?? '—',
      planta: r.planta ?? '—',
      cotizacion: r.cotizacion ?? '—',
      parte: r.parte ?? '—',
      inspector: r.inspector ?? '—',
      turno: r.turno ?? '—',
      estatus: mapEstatus(r.status),
      piezas: totalPieces.toLocaleString('es-MX'),
      pctNG: totalPieces > 0 ? `${((totalNg / totalPieces) * 100).toFixed(1)}%` : '-',
    }
  })

  return { rows, total: body.data.total }
}
