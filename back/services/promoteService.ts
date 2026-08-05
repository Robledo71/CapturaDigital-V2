import 'server-only'

// ---------------------------------------------------------------------------
// promoteService — "Promover" los reportes diarios de un item de orden INFORMAL
// a un item de orden FORMAL ya descargada.
//
// Contrato real (qb_sync/src/modules/informal-orders):
//   POST /qb_sync/informal-orders/:itemOrdenInformalId/promote
//   body: { item_orden_id: number }   // item FORMAL destino (item_orden_id)
//   200:  { success: true, data: { item_orden_informal_id, item_orden_id, promovido: true } }
//
//   Roles: superusuario / supervisor_regional / supervisor (+ permiso
//   `reportes_informales.promover`). Además, salvo superusuario, el usuario debe
//   ser el SUPERVISOR de las sesiones de inspección de ese item informal, si no
//   el backend responde 403.
//
//   Errores del service (informal-orders.service.js#promoverReportesInformales):
//     403 → no eres el supervisor de las sesiones de ese item informal.
//     404 → algún id "no existe" (item informal / item formal).
//     409 → "No hay reportes informales pendientes" que promover.
//     400 → validación (item_orden_id inválido).
// ---------------------------------------------------------------------------

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

async function readErrorMessage(res: Response): Promise<string | undefined> {
  try {
    const body = await res.json()
    return typeof body?.message === 'string' ? body.message : undefined
  } catch {
    return undefined
  }
}

export type PromoverOrdenInformalInput = {
  /** `item_orden_informal_id` del item informal cuyos reportes se promueven. */
  itemOrdenInformalId: number
  /** `item_orden_id` del item FORMAL destino (ya descargado/persistido). */
  itemOrdenId: number
}

export type PromoverOrdenInformalResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'invalid' | 'forbidden' | 'error'; error: string }

/**
 * Promueve los reportes diarios de un item de orden informal hacia un item de
 * orden formal ya persistido (procedimiento almacenado
 * `captura.promover_reportes_informales` en el backend).
 */
export async function promoverOrdenInformal(
  input: PromoverOrdenInformalInput,
  accessToken: string,
): Promise<PromoverOrdenInformalResult> {
  let res: Response
  try {
    res = await fetch(
      `${baseUrl()}/qb_sync/informal-orders/${encodeURIComponent(String(input.itemOrdenInformalId))}/promote`,
      {
        method: 'POST',
        headers: apiHeaders(accessToken),
        body: JSON.stringify({ item_orden_id: input.itemOrdenId }),
      },
    )
  } catch {
    return { ok: false, reason: 'error', error: 'No se pudo conectar con el servidor. Intenta nuevamente.' }
  }

  if (res.status === 403) {
    const message = await readErrorMessage(res)
    return {
      ok: false,
      reason: 'forbidden',
      error: message ?? 'No eres el supervisor de las sesiones de este item — no puedes promoverlo.',
    }
  }

  if (res.status === 404) {
    const message = await readErrorMessage(res)
    return { ok: false, reason: 'not_found', error: message ?? 'Item no encontrado.' }
  }

  if (res.status === 409 || res.status === 400) {
    const message = await readErrorMessage(res)
    return {
      ok: false,
      reason: 'invalid',
      error: message ?? 'No hay reportes informales pendientes para promover.',
    }
  }

  if (!res.ok) {
    const message = await readErrorMessage(res)
    return { ok: false, reason: 'error', error: message ?? 'No se pudo promover la orden informal.' }
  }

  return { ok: true }
}
