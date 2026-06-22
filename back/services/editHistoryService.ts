import 'server-only'

/** Valores de piezas (null en registros previos a la captura de detalle). */
export type PiezasSnapshot = {
  ok: number | null
  ng: number | null
  scrap: number | null
  recovered: number | null
}

/** Incidencia en un snapshot del historial. */
export type IncidenciaSnapshot = {
  name: string
  pieces: number
}

export type EditHistoryRow = {
  id: number
  dailyReportId: number
  dailyReportConsecutive: number
  reportItemId: number | null
  usuario: string
  motivo: string
  createdAt: string
  /** Valores antes/después de la edición, para ver qué se modificó. */
  valores: { before: PiezasSnapshot; after: PiezasSnapshot }
  /** Incidencias antes/después (lista vacía en registros previos a esta función). */
  incidencias: { before: IncidenciaSnapshot[]; after: IncidenciaSnapshot[] }
}

function apiHeaders(accessToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-App-Token': process.env.X_APP_TOKEN ?? '',
    Authorization: `Bearer ${accessToken}`,
  }
}

function baseUrl(): string {
  return (process.env.QSYNC_API_URL ?? '').replace(/\/$/, '')
}

export async function getEditHistory(accessToken: string): Promise<EditHistoryRow[]> {
  const res = await fetch(`${baseUrl()}/qb_sync/edit-history`, {
    headers: apiHeaders(accessToken),
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`getEditHistory: la API respondió ${res.status}`)
  }
  const body = await res.json()
  return body.data as EditHistoryRow[]
}
