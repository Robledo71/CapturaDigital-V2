import 'server-only'

import type { InformalOrderRow } from '@/shared/types/informalOrder'

// ---------------------------------------------------------------------------
// External API shape — handles snake_case responses from qb_sync
// ---------------------------------------------------------------------------

type ExternalInspector = { id: number; name: string }

type ExternalInformalOrder = {
  orden_informal_id: number
  tipo_orden: 'OV' | 'OA'
  cliente_id: number
  cliente_nombre: string | null
  item_orden_informal_id: number
  numero_parte: string
  nombre_parte: string | null
  planta_id: number | null
  planta_nombre: string | null
  solicitante_nombre: string | null
  inspectores: ExternalInspector[] | null
  estado_reporte: 'ENVIADO' | 'FIRMADO' | null
}

function mapExternalInformalOrder(raw: ExternalInformalOrder): InformalOrderRow {
  return {
    ordenInformalId: raw.orden_informal_id,
    itemOrdenInformalId: raw.item_orden_informal_id,
    tipoOrden: raw.tipo_orden,
    clienteId: raw.cliente_id,
    clienteNombre: raw.cliente_nombre ?? null,
    plantaId: raw.planta_id ?? null,
    plantaNombre: raw.planta_nombre ?? null,
    numeroParte: raw.numero_parte,
    nombreParte: raw.nombre_parte ?? null,
    solicitanteNombre: raw.solicitante_nombre ?? null,
    inspectores: Array.isArray(raw.inspectores) ? raw.inspectores.map((i) => ({ id: i.id, name: i.name })) : [],
    estadoReporte: raw.estado_reporte ?? null,
  }
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

// ---------------------------------------------------------------------------
// getInformalOrders
// ---------------------------------------------------------------------------

export async function getInformalOrders(accessToken: string): Promise<InformalOrderRow[]> {
  const res = await fetch(`${baseUrl()}/qb_sync/informal-orders`, {
    headers: apiHeaders(accessToken),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`getInformalOrders: API responded ${res.status}`)
  }

  const body = await res.json()
  const rows: ExternalInformalOrder[] = Array.isArray(body?.data) ? body.data : []
  return rows.map(mapExternalInformalOrder)
}

// ---------------------------------------------------------------------------
// createInformalOrder
// ---------------------------------------------------------------------------

export type CreateInformalOrderInput = {
  tipoOrden: 'OV' | 'OA'
  clienteId: number
  item: {
    numeroParte: string
    nombreParte?: string
    plantaId: number
  }
  inspectionSession?: {
    idSupervisor: string
    idInspectores: string[]
  }
}

export type CreateInformalOrderResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string }

async function readErrorMessage(res: Response): Promise<string | undefined> {
  try {
    const body = await res.json()
    return typeof body?.message === 'string' ? body.message : undefined
  } catch {
    return undefined
  }
}

export async function createInformalOrder(
  input: CreateInformalOrderInput,
  accessToken: string,
): Promise<CreateInformalOrderResult> {
  let res: Response
  try {
    res = await fetch(`${baseUrl()}/qb_sync/informal-orders`, {
      method: 'POST',
      headers: apiHeaders(accessToken),
      body: JSON.stringify({
        tipo_orden: input.tipoOrden,
        cliente_id: input.clienteId,
        item: {
          numero_parte: input.item.numeroParte,
          nombre_parte: input.item.nombreParte || undefined,
          planta_id: input.item.plantaId,
        },
        ...(input.inspectionSession
          ? {
              inspectionSession: {
                id_supervisor: input.inspectionSession.idSupervisor,
                id_inspectores: input.inspectionSession.idInspectores,
              },
            }
          : {}),
      }),
    })
  } catch {
    return { ok: false, error: 'No se pudo conectar con el servidor. Intenta nuevamente.' }
  }

  if (res.status === 403) {
    const message = await readErrorMessage(res)
    return { ok: false, error: message ?? 'No autorizado para crear órdenes informales.' }
  }

  if (res.status === 409) {
    const message = await readErrorMessage(res)
    return { ok: false, error: message ?? 'Conflicto al crear la orden informal.' }
  }

  if (!res.ok) {
    const message = await readErrorMessage(res)
    return { ok: false, error: message ?? 'No se pudo crear la orden informal.' }
  }

  const body = await res.json()
  return { ok: true, data: body?.data }
}

// ---------------------------------------------------------------------------
// assignInformalSession
// ---------------------------------------------------------------------------

export type AssignInformalSessionInput = {
  idSupervisor: string
  idInspectores: string[]
}

export type AssignInformalSessionResult =
  | { ok: true }
  | { ok: false; error: string }

export async function assignInformalSession(
  itemId: number,
  input: AssignInformalSessionInput,
  accessToken: string,
): Promise<AssignInformalSessionResult> {
  let res: Response
  try {
    res = await fetch(`${baseUrl()}/qb_sync/informal-orders/${encodeURIComponent(String(itemId))}/session`, {
      method: 'POST',
      headers: apiHeaders(accessToken),
      body: JSON.stringify({
        id_supervisor: input.idSupervisor,
        id_inspectores: input.idInspectores,
      }),
    })
  } catch {
    return { ok: false, error: 'No se pudo conectar con el servidor. Intenta nuevamente.' }
  }

  if (res.status === 403) {
    const message = await readErrorMessage(res)
    return { ok: false, error: message ?? 'No autorizado para asignar inspectores a este item.' }
  }

  if (res.status === 409) {
    const message = await readErrorMessage(res)
    return { ok: false, error: message ?? 'No se pudo asignar (conflicto de sesión).' }
  }

  if (!res.ok) {
    const message = await readErrorMessage(res)
    return { ok: false, error: message ?? 'No se pudo asignar la sesión de inspección.' }
  }

  return { ok: true }
}
