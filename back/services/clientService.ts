import 'server-only'
import type { ClienteRow } from '@/shared/types/cliente'

interface QbSyncClienteRaw {
  id: number
  nombre: string
  razon_social: string | null
  rfc: string | null
  direccion: string | null
  po: boolean | null
  usuario_id: number | null
  usuario_codigo: string | null
  usuario_correo: string | null
  usuario_activo?: boolean | null
}

interface QbSyncMutationResponse {
  success: boolean
  data: QbSyncClienteRaw
}

export type CreateClienteInput = {
  nombre: string
  razonSocial?: string
  rfc: string
  direccion: string
  po?: boolean
}

export type UpdateClienteInput = {
  id: number
  nombre: string
  razonSocial?: string
  rfc: string
  direccion: string
  po?: boolean
}

export type CreateClienteResult =
  | { ok: true; cliente: ClienteRow }
  | { ok: false; reason: 'duplicate_name' | 'error' }

export type UpdateClienteResult =
  | { ok: true; cliente: ClienteRow }
  | { ok: false; reason: 'not_found' | 'error' }

export type DeleteClienteResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'error' }

function mapRaw(raw: QbSyncClienteRaw): ClienteRow {
  return {
    id: raw.id,
    nombre: raw.nombre,
    razonSocial: raw.razon_social ?? '',
    rfc: raw.rfc ?? '',
    direccion: raw.direccion ?? '',
    po: !!raw.po,
    usuarioId: raw.usuario_id,
    usuarioCodigo: raw.usuario_codigo,
    usuarioCorreo: raw.usuario_correo,
  }
}

function apiHeaders(accessToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-App-Token': process.env.X_APP_TOKEN ?? '',
    Authorization: `Bearer ${accessToken}`,
  }
}

const BASE = () => process.env.QSYNC_API_URL ?? 'http://localhost:3001'

export async function getAllClientes(accessToken: string): Promise<ClienteRow[]> {
  const res = await fetch(`${BASE()}/qb_sync/clientes`, {
    headers: apiHeaders(accessToken),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`getAllClientes failed: ${res.status}`)
  const body = await res.json() as { success: boolean; data: QbSyncClienteRaw[] }
  return body.data.map(mapRaw)
}

export async function createCliente(
  input: CreateClienteInput,
  accessToken: string,
): Promise<CreateClienteResult> {
  const res = await fetch(`${BASE()}/qb_sync/clientes`, {
    method: 'POST',
    headers: apiHeaders(accessToken),
    body: JSON.stringify({
      nombre: input.nombre,
      razon_social: input.razonSocial,
      rfc_tax_id: input.rfc,
      direccion: input.direccion,
      po: input.po,
    }),
  })
  if (res.status === 409) return { ok: false, reason: 'duplicate_name' }
  if (!res.ok) return { ok: false, reason: 'error' }
  const body = await res.json() as QbSyncMutationResponse
  return { ok: true, cliente: mapRaw(body.data) }
}

export async function updateCliente(
  input: UpdateClienteInput,
  accessToken: string,
): Promise<UpdateClienteResult> {
  const res = await fetch(`${BASE()}/qb_sync/clientes/${input.id}`, {
    method: 'PUT',
    headers: apiHeaders(accessToken),
    body: JSON.stringify({
      nombre: input.nombre,
      razon_social: input.razonSocial,
      rfc_tax_id: input.rfc,
      direccion: input.direccion,
      po: input.po,
    }),
  })
  if (res.status === 404) return { ok: false, reason: 'not_found' }
  if (!res.ok) return { ok: false, reason: 'error' }
  const body = await res.json() as QbSyncMutationResponse
  return { ok: true, cliente: mapRaw(body.data) }
}

export async function deleteCliente(
  id: number,
  accessToken: string,
): Promise<DeleteClienteResult> {
  const res = await fetch(`${BASE()}/qb_sync/clientes/${id}`, {
    method: 'DELETE',
    headers: apiHeaders(accessToken),
  })
  if (res.status === 404) return { ok: false, reason: 'not_found' }
  if (!res.ok) return { ok: false, reason: 'error' }
  return { ok: true }
}

// ─── Create client user ────────────────────────────────────────────────────────

export type CreateClientUserInput = {
  clienteId: number
  nombreCompleto: string
  codigoEmpleado: string
  correo: string
  contrasena: string
}

export type CreateClientUserResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'duplicate' | 'validation' | 'error'; message?: string }

export async function createClientUser(
  input: CreateClientUserInput,
  accessToken: string,
): Promise<CreateClientUserResult> {
  const res = await fetch(`${BASE()}/qb_sync/clientes/${input.clienteId}/user`, {
    method: 'POST',
    headers: apiHeaders(accessToken),
    body: JSON.stringify({
      nombre_completo: input.nombreCompleto,
      codigo_empleado: input.codigoEmpleado,
      correo:          input.correo,
      contrasena:      input.contrasena,
    }),
  })
  if (res.status === 404) return { ok: false, reason: 'not_found' }
  if (res.status === 409) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    return { ok: false, reason: 'duplicate', message: body.message }
  }
  if (res.status === 400) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    return { ok: false, reason: 'validation', message: body.message }
  }
  if (!res.ok) return { ok: false, reason: 'error' }
  return { ok: true }
}
