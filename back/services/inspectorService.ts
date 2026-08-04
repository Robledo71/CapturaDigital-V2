import 'server-only'

import type { InspectorRow } from '@/shared/types/inspector'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreateInspectorInput = {
  // Opcional: si se omite, el backend genera el código automáticamente (INS-00x).
  codigoEmpleado?: string
  nombreEmpleado: string
  apellidoPaterno: string
  // Opcional: si se omite, la BD asigna 'X' por defecto en catalogos.empleados.
  apellidoMaterno?: string
  plantaIds?: number[]
}

export type CreateInspectorResult =
  | { ok: true; inspector: InspectorRow; generatedPassword: string }
  | { ok: false; reason: 'duplicate_codigo'; error: string }
  | { ok: false; reason: 'limit'; error: string }

export type UpdateInspectorNameInput = {
  nombreEmpleado: string
  apellidoPaterno: string
  // Opcional: si se omite/vacío, el backend guarda 'X' por defecto.
  apellidoMaterno?: string
}

export type UpdateInspectorNameResult =
  | { ok: true; inspector: InspectorRow }
  | { ok: false; reason: 'not_found' | 'forbidden'; error: string }

export type ResetInspectorPasswordResult =
  | { ok: true; generatedPassword: string }
  | { ok: false; error: string }

// ---------------------------------------------------------------------------
// External API shape — handles snake_case and camelCase responses
// ---------------------------------------------------------------------------

type ExternalInspector = {
  empleado_id?: number
  empleadoId?: number
  codigo_usuario?: string
  codigoUsuario?: string
  nombre_empleado?: string
  nombreEmpleado?: string
  apellido_paterno?: string
  apellidoPaterno?: string
  apellido_materno?: string
  apellidoMaterno?: string
  nombre_completo?: string
  nombreCompleto?: string
  plantas?: { id: number; nombre: string }[]
  activo?: boolean
  ocupado?: boolean
  trabajo_actual?: { part_number: string | null; quotation_consecutive: string | null } | null
  trabajoActual?: { partNumber: string | null; quotationConsecutive: string | null } | null
}

function mapExternalInspector(i: ExternalInspector): InspectorRow {
  // 'X' es el default que la BD asigna a apellido_materno cuando no se
  // capturó; se normaliza a cadena vacía para no mostrarlo en el formulario.
  const apellidoMaternoRaw = i.apellido_materno ?? i.apellidoMaterno ?? ''
  const rawWork = i.trabajo_actual ?? null
  const trabajoActual = i.trabajoActual ?? (rawWork
    ? { partNumber: rawWork.part_number ?? null, quotationConsecutive: rawWork.quotation_consecutive ?? null }
    : null)
  return {
    empleadoId: i.empleado_id ?? i.empleadoId ?? 0,
    codigoUsuario: i.codigo_usuario ?? i.codigoUsuario ?? '',
    nombreEmpleado: i.nombre_empleado ?? i.nombreEmpleado ?? '',
    apellidoPaterno: i.apellido_paterno ?? i.apellidoPaterno ?? '',
    apellidoMaterno: apellidoMaternoRaw === 'X' ? '' : apellidoMaternoRaw,
    nombreCompleto: i.nombre_completo ?? i.nombreCompleto ?? '',
    plantas: Array.isArray(i.plantas) ? i.plantas.map((p) => ({ id: p.id, nombre: p.nombre })) : [],
    activo: i.activo ?? true,
    ocupado: i.ocupado ?? false,
    trabajoActual,
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

export async function getInspectores(
  accessToken: string,
): Promise<{ inspectors: InspectorRow[]; count: number; limit: number }> {
  const res = await fetch(`${baseUrl()}/qb_sync/inspectors`, {
    headers: apiHeaders(accessToken),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`getInspectores: API responded ${res.status}`)
  }

  const body = await res.json()
  const data = body?.data ?? {}
  const rawInspectors: ExternalInspector[] = Array.isArray(data.inspectors) ? data.inspectors : []

  return {
    inspectors: rawInspectors.map(mapExternalInspector),
    count: typeof data.count === 'number' ? data.count : rawInspectors.length,
    limit: typeof data.limit === 'number' ? data.limit : 50,
  }
}

// Preview read-only del próximo código de inspector (INS-00x) para el modal de
// creación. Devuelve null si el backend no responde OK.
export async function getNextInspectorCodigo(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl()}/qb_sync/inspectors/next-codigo`, {
      headers: apiHeaders(accessToken),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const body = await res.json()
    return typeof body?.data?.codigo === 'string' ? body.data.codigo : null
  } catch {
    return null
  }
}

export async function createInspector(
  input: CreateInspectorInput,
  accessToken: string,
): Promise<CreateInspectorResult> {
  const res = await fetch(`${baseUrl()}/qb_sync/inspectors`, {
    method: 'POST',
    headers: apiHeaders(accessToken),
    body: JSON.stringify({
      // Se omite si no viene → el backend genera el código automáticamente.
      codigo_empleado: input.codigoEmpleado || undefined,
      nombre_empleado: input.nombreEmpleado,
      apellido_paterno: input.apellidoPaterno,
      // Se omite si viene vacío/undefined → la BD asigna 'X' por defecto.
      apellido_materno: input.apellidoMaterno || undefined,
      planta_ids: input.plantaIds ?? [],
    }),
  })

  if (res.status === 409) {
    return { ok: false, reason: 'duplicate_codigo', error: 'Ya existe un usuario con ese código.' }
  }

  if (res.status === 422) {
    const errBody = await res.json().catch(() => ({}))
    if (errBody?.reason === 'inspector_limit') {
      return {
        ok: false,
        reason: 'limit',
        error: errBody?.message ?? 'Se alcanzó el límite de 50 cuentas de inspector.',
      }
    }
    return { ok: false, reason: 'limit', error: errBody?.message ?? 'No se pudo crear el inspector.' }
  }

  if (!res.ok) {
    throw new Error(`createInspector: API responded ${res.status}`)
  }

  const body = await res.json()
  const raw: ExternalInspector = body.data?.inspector ?? {}
  const generatedPassword: string = body.data?.generated_password ?? body.data?.generatedPassword ?? ''
  return { ok: true, inspector: mapExternalInspector(raw), generatedPassword }
}

export async function updateInspectorName(
  empleadoId: number,
  fields: UpdateInspectorNameInput,
  accessToken: string,
): Promise<UpdateInspectorNameResult> {
  const res = await fetch(`${baseUrl()}/qb_sync/inspectors/${encodeURIComponent(String(empleadoId))}`, {
    method: 'PUT',
    headers: apiHeaders(accessToken),
    body: JSON.stringify({
      nombre_empleado: fields.nombreEmpleado,
      apellido_paterno: fields.apellidoPaterno,
      apellido_materno: fields.apellidoMaterno || undefined,
    }),
  })

  if (res.status === 404) {
    return { ok: false, reason: 'not_found', error: 'El inspector no existe.' }
  }

  if (res.status === 403) {
    return { ok: false, reason: 'forbidden', error: 'No tienes permiso para editar este inspector.' }
  }

  if (!res.ok) {
    throw new Error(`updateInspectorName: API responded ${res.status}`)
  }

  const body = await res.json()
  const raw: ExternalInspector = body.data?.inspector ?? {}
  return { ok: true, inspector: mapExternalInspector(raw) }
}

export async function resetInspectorPassword(
  empleadoId: number,
  accessToken: string,
): Promise<ResetInspectorPasswordResult> {
  const res = await fetch(
    `${baseUrl()}/qb_sync/inspectors/${encodeURIComponent(String(empleadoId))}/reset-password`,
    {
      method: 'POST',
      headers: apiHeaders(accessToken),
    },
  )

  if (!res.ok) {
    if (res.status === 404) return { ok: false, error: 'El inspector no existe.' }
    if (res.status === 403) {
      return { ok: false, error: 'No tienes permiso para resetear la contraseña de este inspector.' }
    }
    throw new Error(`resetInspectorPassword: API responded ${res.status}`)
  }

  const body = await res.json()
  const generatedPassword: string = body.data?.generated_password ?? body.data?.generatedPassword ?? ''
  return { ok: true, generatedPassword }
}
