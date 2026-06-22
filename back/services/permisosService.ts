import 'server-only'

// Cliente del módulo de permisos de qb_sync (matriz rol × permiso, Fase 3a).
// Endpoints admin-only: GET /qb_sync/permissions, PUT /qb_sync/permissions/:rol.

export type PermisoCatalogo = {
  key: string
  modulo: string
  descripcion: string
}

export type PermisosConfig = {
  permissions: PermisoCatalogo[]
  matrix: Record<string, string[]>
  editableRoles: string[]
}

export type UpdateRolePermisosResult =
  | { ok: true; permisos: string[] }
  | { ok: false; error: string }

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

/** Catálogo + matriz rol→permisos + roles editables (para la pantalla de admin). */
export async function getPermisosConfig(accessToken: string): Promise<PermisosConfig> {
  const res = await fetch(`${baseUrl()}/qb_sync/permissions`, {
    headers: apiHeaders(accessToken),
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`getPermisosConfig: la API respondió ${res.status}`)
  }
  const body = await res.json()
  return body.data as PermisosConfig
}

/** Reemplaza por completo los permisos de un rol. */
export async function updateRolePermisos(
  rol: string,
  permissionKeys: string[],
  accessToken: string,
): Promise<UpdateRolePermisosResult> {
  const res = await fetch(`${baseUrl()}/qb_sync/permissions/${encodeURIComponent(rol)}`, {
    method: 'PUT',
    headers: apiHeaders(accessToken),
    body: JSON.stringify({ permission_keys: permissionKeys }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { ok: false, error: body?.message ?? `La API respondió ${res.status}` }
  }
  const body = await res.json()
  return { ok: true, permisos: body.data.permission_keys as string[] }
}

// ── Overrides por usuario (revoke-only, Fase 3b) ──────────────────────────────────

export type UserPermisoItem = {
  key: string
  modulo: string
  descripcion: string
  revoked: boolean
}

export type UserPermisos = {
  userId: number
  rol: string
  /** Baseline del rol, enriquecido con metadata + flag `revoked` por permiso. */
  permisos: UserPermisoItem[]
  revoked: string[]
  effective: string[]
}

export type UpdateUserRevokesResult =
  | { ok: true; revoked: string[] }
  | { ok: false; error: string }

/** Baseline del rol + revokes + efectivos de un usuario (para el modal). */
export async function getUserPermisos(
  userId: number,
  accessToken: string,
): Promise<UserPermisos> {
  const res = await fetch(`${baseUrl()}/qb_sync/permissions/usuarios/${userId}`, {
    headers: apiHeaders(accessToken),
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? `getUserPermisos: la API respondió ${res.status}`)
  }
  const body = await res.json()
  return body.data as UserPermisos
}

/** Reemplaza los permisos revocados de un usuario. */
export async function updateUserRevokes(
  userId: number,
  revokedKeys: string[],
  accessToken: string,
): Promise<UpdateUserRevokesResult> {
  const res = await fetch(`${baseUrl()}/qb_sync/permissions/usuarios/${userId}`, {
    method: 'PUT',
    headers: apiHeaders(accessToken),
    body: JSON.stringify({ revoked_keys: revokedKeys }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { ok: false, error: body?.message ?? `La API respondió ${res.status}` }
  }
  const body = await res.json()
  return { ok: true, revoked: body.data.revoked as string[] }
}
