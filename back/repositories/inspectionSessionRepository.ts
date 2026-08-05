import 'server-only'

// ---------------------------------------------------------------------------
// Result type — semantic outcome of a qb_sync write
// ---------------------------------------------------------------------------

export type SessionApiResult =
  | { ok: true }
  // status 0 = transport/network failure (qb_sync was unreachable).
  | { ok: false; status: number; message?: string }

function apiHeaders(accessToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-App-Token': process.env.X_APP_TOKEN ?? '',
    Authorization: `Bearer ${accessToken}`,
  }
}

function baseUrl(): string {
  return process.env.QSYNC_API_URL ?? 'http://localhost:3001'
}

// ---------------------------------------------------------------------------
// Wire shapes (qb_sync contract)
// ---------------------------------------------------------------------------

export type SessionPayload = {
  idSupervisor: string
  idInspectores: string[]
}

// order / quotation / orderItem are QB pass-through data forwarded to qb_sync
// verbatim, so they are typed as already-wire-shaped records.

export type OtherItemEntry = {
  quotation: {
    consecutive_number: string | number
    client_email?: string | null
    status?: string | null
    purchase_order_number?: string | null
    contact_emails?: string | null
    order_user_name?: string | null
  }
  orderItem: {
    part_number?: string | null
    part_name?: string
    inventory?: number
    inventory_done?: number
    plant_name?: string
  }
}

export type OrderItemTree = {
  order: Record<string, unknown>
  quotation: Record<string, unknown>
  orderItem: Record<string, unknown>
  /** Other items in the same order (not the one being assigned). Only sent on first-time upsert (orderItemId === 0). */
  otherItems?: OtherItemEntry[]
}

function inspectionSessionBody(s: SessionPayload) {
  return {
    id_supervisor: s.idSupervisor,
    id_inspectores: s.idInspectores,
  }
}

// qb_sync may return a 2xx with `{ success: false }` on a soft failure, so we
// treat that as an error too — same rule the old inline code used.
async function interpret(res: Response): Promise<SessionApiResult> {
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean
    message?: string
  }
  if (!res.ok || body.success === false) {
    return { ok: false, status: res.status, message: body.message }
  }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

/**
 * Upsert the full Order → Quotation → OrderItem tree and create the
 * inspection session(s) (one per inspector) in a single call. ALL assignment
 * now goes through this endpoint — qb_sync upserts the item by consecutive
 * numbers + part number, whether or not it already existed.
 */
export async function createItemWithSession(
  tree: OrderItemTree,
  session: SessionPayload,
  accessToken: string,
): Promise<SessionApiResult> {
  try {
    const payload: Record<string, unknown> = {
      order: tree.order,
      quotation: tree.quotation,
      orderItem: tree.orderItem,
      inspectionSession: inspectionSessionBody(session),
    }
    if (tree.otherItems && tree.otherItems.length > 0) {
      payload.otherItems = tree.otherItems
    }
    const res = await fetch(`${baseUrl()}/qb_sync/order-items`, {
      method: 'POST',
      headers: apiHeaders(accessToken),
      body: JSON.stringify(payload),
    })
    return interpret(res)
  } catch {
    return { ok: false, status: 0 }
  }
}

/**
 * Upsert the full Order → Quotation → OrderItem tree WITHOUT creating an
 * inspection session — used by "Descargar orden" to persist an order (e.g.
 * one that came from a QB search and has `id === 0`) without assigning it to
 * any inspector yet.
 *
 * TODO CONTRATO ASUMIDO: hoy `POST /qb_sync/order-items` exige `inspectionSession`
 * en el body (ver `createItemWithSession` arriba). Este flujo depende de que el
 * backend haga ese campo OPCIONAL — cuando falte, debe upsertear el árbol sin
 * crear ninguna sesión de inspección. Confirmar con el usuario antes de wirear
 * el backend real.
 */
export async function upsertOrderTree(
  tree: OrderItemTree,
  accessToken: string,
): Promise<SessionApiResult> {
  try {
    const payload: Record<string, unknown> = {
      order: tree.order,
      quotation: tree.quotation,
      orderItem: tree.orderItem,
    }
    if (tree.otherItems && tree.otherItems.length > 0) {
      payload.otherItems = tree.otherItems
    }
    const res = await fetch(`${baseUrl()}/qb_sync/order-items`, {
      method: 'POST',
      headers: apiHeaders(accessToken),
      body: JSON.stringify(payload),
    })
    return interpret(res)
  } catch {
    return { ok: false, status: 0 }
  }
}

/**
 * Close ONE inspector's session on an order-item, leaving any other assigned
 * inspectors' sessions untouched. Idempotent on the backend (200 with
 * `closed: 0` if there was nothing to close for that empleado_id).
 */
export async function closeInspectorSession(
  orderItemId: number,
  empleadoId: number,
  accessToken: string,
): Promise<SessionApiResult> {
  try {
    const res = await fetch(
      `${baseUrl()}/qb_sync/order-items/${orderItemId}/inspectors/${empleadoId}`,
      {
        method: 'DELETE',
        headers: apiHeaders(accessToken),
      },
    )
    return interpret(res)
  } catch {
    return { ok: false, status: 0 }
  }
}
