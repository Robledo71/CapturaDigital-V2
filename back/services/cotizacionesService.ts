import 'server-only'

const BASE = () => process.env.QSYNC_API_URL ?? 'http://localhost:3001'

function apiHeaders(accessToken: string) {
  return {
    'X-App-Token': process.env.X_APP_TOKEN ?? '',
    Authorization: `Bearer ${accessToken}`,
  }
}

export type CotizacionRow = {
  id: number
  consecutiveNumber: string | null
  clientEmail: string | null
  clientName: string | null
  orderConsecutive: string | null
  status: string | null
  desbloqueado: boolean
  createdAt: string
}

export async function getCotizaciones(accessToken: string): Promise<CotizacionRow[]> {
  try {
    const res = await fetch(`${BASE()}/qb_sync/quotations`, {
      cache: 'no-store',
      headers: apiHeaders(accessToken),
    })
    if (!res.ok) return []
    const json = await res.json()
    const rows: Array<{
      id: number
      consecutive_number: string | null
      client_email: string | null
      client_name: string | null
      order_consecutive: string | null
      status: string | null
      desbloqueado: boolean
      created_at: string
    }> = json?.data ?? []
    return rows.map((r) => ({
      id: r.id,
      consecutiveNumber: r.consecutive_number,
      clientEmail: r.client_email,
      clientName: r.client_name,
      orderConsecutive: r.order_consecutive,
      status: r.status,
      desbloqueado: r.desbloqueado ?? false,
      createdAt: r.created_at,
    }))
  } catch {
    return []
  }
}
