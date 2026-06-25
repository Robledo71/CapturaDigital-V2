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
  idTablet: string
  /** ISO timestamp marking when the assignment starts. */
  fechaInicio: string
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
    id_tablet: s.idTablet,
    status: 'assigned',
    fecha_inicio: s.fechaInicio,
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

/** Create an inspection session for an item that ALREADY exists in qb_sync. */
export async function createSessionForItem(
  orderItemId: number,
  session: SessionPayload,
  accessToken: string,
): Promise<SessionApiResult> {
  try {
    const res = await fetch(`${baseUrl()}/qb_sync/order-items/${orderItemId}/session`, {
      method: 'POST',
      headers: apiHeaders(accessToken),
      body: JSON.stringify(inspectionSessionBody(session)),
    })
    return interpret(res)
  } catch {
    return { ok: false, status: 0 }
  }
}

/**
 * Materialize a NEW item (Order → Quotation → OrderItem) coming from a QB
 * search and create its inspection session in a single upsert call.
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

/** Delete the active session of an item (release its tablet). */
export async function deleteSessionForItem(
  orderItemId: number,
  accessToken: string,
): Promise<SessionApiResult> {
  try {
    const res = await fetch(`${baseUrl()}/qb_sync/order-items/${orderItemId}/session`, {
      method: 'DELETE',
      headers: apiHeaders(accessToken),
    })
    return interpret(res)
  } catch {
    return { ok: false, status: 0 }
  }
}
