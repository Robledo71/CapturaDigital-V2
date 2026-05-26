import 'server-only'

// ─── Response shape types ─────────────────────────────────────────────────────

export interface QBOrderItem {
  inventory: string
  inventory_done: string
  part_number: string
  part_name: string
  incidents: string | null
  plant_name: string
}

export interface QBOrderData {
  id: number
  state: string | null
  consecutive_number: string
  service_type_detail: string | null
  pieces_per_hour: string | null
  authorized_hours: string | null
  price_per_hour: string | null
  language: string | null
  user_name: string | null
  region_name: string | null
  client_name: string | null
  client_contact_name: string | null
  client_contact_email: string | null
  service_type_name: string | null
  plant_name: string | null
  created_at: string
  updated_at: string
}

export interface QBCotizacion {
  id: number
  consecutive_number: string
  client_name: string | null
  client_email: string | null
  status: string | null
  purchase_order_number: string | null
  contact_emails: string | null
  order_user_name: string | null
  order_consecutive_number: string | null
  region_name: string | null
  plant_name: string | null
  order_id: number
  created_at: string
  updated_at: string
  order_items: QBOrderItem[]
}

// ─── Result types ─────────────────────────────────────────────────────────────

export type QBError = 'auth' | 'rate_limit' | 'validation' | 'server' | 'network'

export type SearchOrderResult =
  | { ok: true; found: true; data: QBOrderData }
  | { ok: true; found: false }
  | { ok: false; error: QBError; message: string }

export type SearchCotizacionesResult =
  | { ok: true; data: QBCotizacion[] }
  | { ok: false; error: QBError; message: string }

// ─── HTTP client interno ──────────────────────────────────────────────────────

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-api-key': process.env.QB_API_KEY ?? '',
    'x-client-id': process.env.QB_CLIENT_ID ?? '',
  }
}

function baseUrl(): string {
  return (process.env.QB_API_URL ?? 'https://qualitybolca.net/apis/v1').replace(/\/$/, '')
}

type PostResult<T> =
  | { ok: true; json: T }
  | { ok: false; error: QBError; message: string }

async function post<T>(path: string, body: Record<string, string>): Promise<PostResult<T>> {
  let res: Response
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    })
  } catch (err) {
    return {
      ok: false,
      error: 'network',
      message: err instanceof Error ? err.message : 'Error de red al contactar QB API.',
    }
  }

  if (res.status === 401) {
    const json = await res.json().catch(() => ({})) as Record<string, unknown>
    return {
      ok: false,
      error: 'auth',
      message: typeof json.msg === 'string' ? json.msg : 'Credenciales QB inválidas o expiradas.',
    }
  }

  if (res.status === 429) {
    return {
      ok: false,
      error: 'rate_limit',
      message: 'Límite de peticiones QB alcanzado. Intenta en 15 minutos.',
    }
  }

  if (res.status === 422) {
    const json = await res.json().catch(() => ({})) as Record<string, unknown>
    const errores = json.errores
    const first = Array.isArray(errores) && typeof (errores[0] as Record<string, unknown>)?.msg === 'string'
      ? (errores[0] as Record<string, unknown>).msg as string
      : 'Error de validación en QB API.'
    return { ok: false, error: 'validation', message: first }
  }

  if (res.status >= 500) {
    return { ok: false, error: 'server', message: 'Error interno del servidor QB.' }
  }

  try {
    return { ok: true, json: (await res.json()) as T }
  } catch {
    return { ok: false, error: 'server', message: 'Respuesta inesperada del servidor QB.' }
  }
}

// ─── searchOrder ──────────────────────────────────────────────────────────────

interface RawOrderResponse {
  ok: boolean
  msg: string
  // QB returns "" (empty string) when the order doesn't exist — not null
  data: QBOrderData | ''
}

export async function searchOrder(orden: string): Promise<SearchOrderResult> {
  const result = await post<RawOrderResponse>('/ordenes', { orden })

  if (!result.ok) return result

  const { data } = result.json

  if (!data || typeof data === 'string') {
    return { ok: true, found: false }
  }

  return { ok: true, found: true, data }
}

// ─── searchCotizaciones ───────────────────────────────────────────────────────

interface RawCotizacionesResponse {
  ok: boolean
  msg: string
  data: QBCotizacion[]
}

export async function searchCotizaciones(coti: string): Promise<SearchCotizacionesResult> {
  const result = await post<RawCotizacionesResponse>('/cotizaciones', { coti })

  if (!result.ok) return result

  return { ok: true, data: result.json.data ?? [] }
}
