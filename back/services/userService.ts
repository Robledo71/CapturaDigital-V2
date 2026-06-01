import 'server-only'

import type { UsuarioRow } from '@/shared/types/usuario'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreateUsuarioInput = {
  nombreCompleto: string
  codigoEmpleado: string
  puesto: string
  plantaId: number | null
  rol: 'supervisor' | 'capturacion' | 'admin' | 'lider' | 'cliente'
  correo: string
  contrasena: string
}

export type CreateUsuarioResult =
  | { ok: true; usuario: UsuarioRow }
  | { ok: false; reason: 'duplicate_codigo' | 'duplicate_correo' }

export type UpdateUsuarioInput = {
  id: number
  nombreCompleto: string
  codigoEmpleado: string
  puesto: string
  plantaId: number | null
  rol: 'admin' | 'supervisor' | 'capturacion' | 'lider' | 'cliente'
  correo: string
}

export type UpdateUsuarioResult =
  | { ok: true; usuario: UsuarioRow }
  | { ok: false; reason: 'duplicate_codigo' | 'duplicate_correo' | 'not_found' }

// ---------------------------------------------------------------------------
// External API shape — handles snake_case and camelCase responses
// ---------------------------------------------------------------------------

type ExternalUser = {
  id?: number
  nombre_completo?: string
  nombreCompleto?: string
  codigo_empleado?: string
  codigoEmpleado?: string
  puesto?: string
  planta_id?: number | null
  plantaId?: number | null
  planta_nombre?: string | null
  plantaNombre?: string | null
  rol?: string
  correo?: string
  is_active?: boolean
  isActive?: boolean
}

function mapExternalUser(u: ExternalUser): UsuarioRow {
  return {
    id: u.id ?? 0,
    nombreCompleto: u.nombre_completo ?? u.nombreCompleto ?? '',
    codigoEmpleado: u.codigo_empleado ?? u.codigoEmpleado ?? '',
    puesto: u.puesto ?? '',
    plantaId: u.planta_id ?? u.plantaId ?? null,
    plantaNombre: u.planta_nombre ?? u.plantaNombre ?? null,
    rol: (u.rol ?? 'capturacion') as UsuarioRow['rol'],
    correo: u.correo ?? '',
    isActive: u.is_active ?? u.isActive ?? true,
  }
}

function apiHeaders(accessToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-App-Token': process.env.X_APP_TOKEN ?? '',
    'Authorization': `Bearer ${accessToken}`,
  }
}

function baseUrl(): string {
  return (process.env.QSYNC_API_URL ?? '').replace(/\/$/, '')
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function getAllUsuarios(accessToken: string): Promise<UsuarioRow[]> {
  const res = await fetch(`${baseUrl()}/qb_sync/users`, {
    headers: apiHeaders(accessToken),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`getAllUsuarios: API responded ${res.status}`)
  }

  const body = await res.json()
  const data: ExternalUser[] = Array.isArray(body.data) ? body.data : []
  return data.map(mapExternalUser)
}

export async function createUsuario(
  input: CreateUsuarioInput,
  accessToken: string,
): Promise<CreateUsuarioResult> {
  const res = await fetch(`${baseUrl()}/qb_sync/users`, {
    method: 'POST',
    headers: apiHeaders(accessToken),
    body: JSON.stringify({
      nombre_completo: input.nombreCompleto,
      codigo_empleado: input.codigoEmpleado,
      puesto: input.puesto,
      planta_id: input.plantaId,
      rol: input.rol,
      correo: input.correo,
      contrasena: input.contrasena,
    }),
  })

  if (res.status === 409) {
    const body = await res.json().catch(() => ({}))
    const message: string = body?.message ?? body?.error ?? ''
    if (/correo|email/i.test(message)) {
      return { ok: false, reason: 'duplicate_correo' }
    }
    return { ok: false, reason: 'duplicate_codigo' }
  }

  if (!res.ok) {
    throw new Error(`createUsuario: API responded ${res.status}`)
  }

  const body = await res.json()
  const raw: ExternalUser = body.data ?? body.usuario ?? body
  return { ok: true, usuario: mapExternalUser(raw) }
}

export async function updateUsuario(
  input: UpdateUsuarioInput,
  accessToken: string,
): Promise<UpdateUsuarioResult> {
  const res = await fetch(
    `${baseUrl()}/qb_sync/users/${encodeURIComponent(input.codigoEmpleado)}`,
    {
      method: 'PUT',
      headers: apiHeaders(accessToken),
      body: JSON.stringify({
        nombre_completo: input.nombreCompleto,
        puesto: input.puesto,
        planta_id: input.plantaId,
        rol: input.rol,
      }),
    },
  )

  if (res.status === 404) {
    return { ok: false, reason: 'not_found' }
  }

  if (res.status === 409) {
    const body = await res.json().catch(() => ({}))
    const message: string = body?.message ?? body?.error ?? ''
    if (/correo|email/i.test(message)) {
      return { ok: false, reason: 'duplicate_correo' }
    }
    return { ok: false, reason: 'duplicate_codigo' }
  }

  if (!res.ok) {
    throw new Error(`updateUsuario: API responded ${res.status}`)
  }

  const body = await res.json()
  const raw: ExternalUser = body.data ?? body.usuario ?? body
  return { ok: true, usuario: mapExternalUser(raw) }
}
