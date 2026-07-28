import 'server-only'

import type { UsuarioRow } from '@/shared/types/usuario'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreateUsuarioInput = {
  nombreEmpleado: string
  apellidoPaterno: string
  // Opcional: si se omite, la BD asigna 'X' por defecto en catalogos.empleados.
  apellidoMaterno?: string
  codigoEmpleado: string
  plantaIds: number[]
  rol:
    | 'superusuario'
    | 'admin'
    | 'gerente'
    | 'supervisor_regional'
    | 'supervisor'
    | 'lider'
    | 'servicio_cliente'
    | 'capturacion'
    | 'inspector'
  correo: string
  contrasena: string
}

export type CreateUsuarioResult =
  | { ok: true; usuario: UsuarioRow }
  | { ok: false; reason: 'duplicate_codigo' | 'duplicate_correo' }

export type UpdateUsuarioInput = {
  id: number
  nombreEmpleado: string
  apellidoPaterno: string
  // Opcional: si se omite/vacío, el backend guarda 'X' por defecto.
  apellidoMaterno?: string
  codigoEmpleado: string
  plantaIds: number[]
  rol:
    | 'superusuario'
    | 'admin'
    | 'gerente'
    | 'supervisor_regional'
    | 'supervisor'
    | 'lider'
    | 'servicio_cliente'
    | 'capturacion'
    | 'inspector'
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
  nombre_empleado?: string
  nombreEmpleado?: string
  apellido_paterno?: string
  apellidoPaterno?: string
  apellido_materno?: string
  apellidoMaterno?: string
  codigo_empleado?: string
  codigoEmpleado?: string
  planta_id?: number | null
  plantaId?: number | null
  planta_nombre?: string | null
  plantaNombre?: string | null
  plantas?: { id: number; nombre: string }[]
  rol?: string
  correo?: string
  is_active?: boolean
  isActive?: boolean
}

function mapExternalUser(u: ExternalUser): UsuarioRow {
  // 'X' es el default que la BD asigna a apellido_materno cuando no se
  // capturó; se normaliza a cadena vacía para no mostrarlo en el formulario.
  const apellidoMaternoRaw = u.apellido_materno ?? u.apellidoMaterno ?? ''
  return {
    id: u.id ?? 0,
    nombreCompleto: u.nombre_completo ?? u.nombreCompleto ?? '',
    nombreEmpleado: u.nombre_empleado ?? u.nombreEmpleado ?? '',
    apellidoPaterno: u.apellido_paterno ?? u.apellidoPaterno ?? '',
    apellidoMaterno: apellidoMaternoRaw === 'X' ? '' : apellidoMaternoRaw,
    codigoEmpleado: u.codigo_empleado ?? u.codigoEmpleado ?? '',
    plantaId: u.planta_id ?? u.plantaId ?? null,
    plantaNombre: u.planta_nombre ?? u.plantaNombre ?? null,
    plantas: Array.isArray(u.plantas) ? u.plantas.map((p) => ({ id: p.id, nombre: p.nombre })) : [],
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
      nombre_empleado: input.nombreEmpleado,
      apellido_paterno: input.apellidoPaterno,
      // Se omite si viene vacío/undefined → la BD asigna 'X' por defecto.
      apellido_materno: input.apellidoMaterno || undefined,
      codigo_empleado: input.codigoEmpleado,
      planta_ids: input.plantaIds,
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

export async function getNextCodigoEmpleado(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl()}/qb_sync/users/next-codigo`, {
      headers: apiHeaders(accessToken),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = await res.json()
    return typeof json?.data?.codigo === 'string' ? json.data.codigo : null
  } catch {
    return null
  }
}

export async function checkCodigoEmpleadoExists(
  codigo: string,
  accessToken: string,
): Promise<boolean> {
  try {
    const res = await fetch(
      `${baseUrl()}/qb_sync/users/codigo-exists?codigo=${encodeURIComponent(codigo)}`,
      {
        headers: apiHeaders(accessToken),
        cache: 'no-store',
      },
    )
    if (!res.ok) return false
    const json = await res.json()
    return json?.data?.exists === true
  } catch {
    return false
  }
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
        nombre_empleado: input.nombreEmpleado,
        apellido_paterno: input.apellidoPaterno,
        apellido_materno: input.apellidoMaterno ?? '',
        planta_ids: input.plantaIds,
        rol: input.rol,
        correo: input.correo,
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
