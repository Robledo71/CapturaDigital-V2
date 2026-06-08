import 'server-only'
import type { TabletRow } from '@/shared/types/tablet'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatUltimaActividad(lastSeenAt: Date | null): string {
  if (!lastSeenAt) return 'Nunca'

  const diffSeconds = Math.floor((Date.now() - lastSeenAt.getTime()) / 1000)

  if (diffSeconds < 60) return 'hace un momento'
  if (diffSeconds < 3600) return `hace ${Math.floor(diffSeconds / 60)} min`
  if (diffSeconds < 86400) return `hace ${Math.floor(diffSeconds / 3600)} h`
  return `hace ${Math.floor(diffSeconds / 86400)} días`
}

function buildPlantPrefix(plantName: string): string {
  const words = plantName.trim().split(/\s+/).slice(0, 3)
  const raw = words.join('').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return raw.slice(0, 12) || 'GEN'
}

function generateCodigoTablet(plantPrefix?: string): string {
  const prefix = plantPrefix ?? 'GEN'
  const digits = String(Math.floor(1000 + Math.random() * 9000))
  return `${prefix}-${digits}`
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
// External API shape — handles snake_case and camelCase responses
// ---------------------------------------------------------------------------

type ExternalTablet = {
  id?: number
  codigoTablet?: string
  codigo_tablet?: string
  alias?: string
  model?: string
  serialNumber?: string
  serial_number?: string
  plantId?: number | null
  plant_id?: number | null
  plantName?: string | null
  plant_name?: string | null
  status?: string
  lastSeenAt?: string | null
  last_seen_at?: string | null
  currentInspectorName?: string | null
  current_inspector_name?: string | null
  notes?: string | null
}

function mapExternalTablet(t: ExternalTablet): TabletRow {
  const lastSeenRaw = t.lastSeenAt ?? t.last_seen_at ?? null
  const lastSeenDate = lastSeenRaw ? new Date(lastSeenRaw) : null

  return {
    id: t.id ?? 0,
    codigotablet: t.codigoTablet ?? t.codigo_tablet ?? '',
    alias: t.alias ?? null,
    modelo: t.model ?? '',
    serie: t.serialNumber ?? t.serial_number ?? '',
    plantaId: t.plantId ?? t.plant_id ?? null,
    plantaNombre: t.plantName ?? t.plant_name ?? null,
    inspector: t.currentInspectorName ?? t.current_inspector_name ?? null,
    estado: t.status ?? 'inactiva',
    ultimaActividad: formatUltimaActividad(lastSeenDate),
    notes: t.notes ?? null,
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreateTabletInput = {
  modelo: string
  serie: string
  codigotablet?: string
  alias?: string
  plantaId?: number
  notes?: string
}

export type CreateTabletResult =
  | { ok: true; tablet: TabletRow }
  | { ok: false; reason: 'duplicate_serie' | 'duplicate_codigo' }

export type UpdateTabletInput = {
  id: number
  modelo: string
  serie: string
  codigotablet?: string
  alias?: string | null
  plantaId?: number | null
  notes?: string | null
  estado?: string
}

export type UpdateTabletResult =
  | { ok: true; tablet: TabletRow }
  | { ok: false; reason: 'not_found' | 'duplicate_serie' | 'duplicate_codigo' }

// ---------------------------------------------------------------------------
// Admin CRUD — external API
// ---------------------------------------------------------------------------

export async function getAllTablets(accessToken: string): Promise<TabletRow[]> {
  const res = await fetch(`${baseUrl()}/qb_sync/tablets`, {
    headers: apiHeaders(accessToken),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`getAllTablets: API responded ${res.status}`)
  }

  const body = await res.json()
  const data: ExternalTablet[] = Array.isArray(body.data) ? body.data : []
  return data.map(mapExternalTablet)
}

export async function createTablet(
  input: CreateTabletInput,
  accessToken: string,
): Promise<CreateTabletResult> {
  // Determine codigo_tablet: use provided value, or generate a prefixed one.
  // Plant name for prefix is looked up from the external tablets list if available,
  // but for generation we just use a safe random code and rely on the API to
  // reject a duplicate (extremely unlikely with 4-digit suffix).
  let codigoTablet = input.codigotablet?.trim() ?? ''
  if (!codigoTablet) {
    // Derive prefix from plantaId name if possible — we use a best-effort local
    // approach since we no longer have direct DB access here.
    let prefix = 'GEN'
    if (input.plantaId) {
      try {
        // Re-use the external tablets endpoint to find any tablet in this plant
        // and extract its prefix, falling back to 'GEN'.
        const listRes = await fetch(`${baseUrl()}/qb_sync/tablets`, {
          headers: apiHeaders(accessToken),
          cache: 'no-store',
        })
        if (listRes.ok) {
          const listBody = await listRes.json()
          const tablets: ExternalTablet[] = Array.isArray(listBody.data) ? listBody.data : []
          const sample = tablets.find(
            (t) => (t.plantId ?? t.plant_id) === input.plantaId,
          )
          const plantName = sample?.plantName ?? sample?.plant_name
          if (plantName) {
            prefix = buildPlantPrefix(plantName)
          }
        }
      } catch {
        // Prefix stays 'GEN' on any fetch failure
      }
    }
    codigoTablet = generateCodigoTablet(prefix)
  }

  const res = await fetch(`${baseUrl()}/qb_sync/tablets`, {
    method: 'POST',
    headers: apiHeaders(accessToken),
    body: JSON.stringify({
      model: input.modelo,
      serial_number: input.serie,
      codigo_tablet: codigoTablet,
      alias: input.alias,
      plant_id: input.plantaId,
      notes: input.notes,
    }),
  })

  if (res.status === 409) {
    const body = await res.json().catch(() => ({}))
    const message: string = body?.message ?? body?.error ?? ''
    if (/codigo|code/i.test(message)) {
      return { ok: false, reason: 'duplicate_codigo' }
    }
    return { ok: false, reason: 'duplicate_serie' }
  }

  if (!res.ok) {
    throw new Error(`createTablet: API responded ${res.status}`)
  }

  const body = await res.json()
  const raw: ExternalTablet = body.data ?? body.tablet ?? body
  return { ok: true, tablet: mapExternalTablet(raw) }
}

export async function updateTablet(
  input: UpdateTabletInput,
  accessToken: string,
): Promise<UpdateTabletResult> {
  const codigotablet = input.codigotablet?.trim()
  if (!codigotablet) {
    return { ok: false, reason: 'not_found' }
  }

  const res = await fetch(
    `${baseUrl()}/qb_sync/tablets/${encodeURIComponent(codigotablet)}`,
    {
      method: 'PUT',
      headers: apiHeaders(accessToken),
      body: JSON.stringify({
        model: input.modelo,
        serial_number: input.serie,
        alias: input.alias,
        status: input.estado === 'mantenimiento' ? 'en_mantenimiento' : input.estado,
        plant_id: input.plantaId,
        notes: input.notes,
      }),
    },
  )

  if (res.status === 404) {
    return { ok: false, reason: 'not_found' }
  }

  if (res.status === 409) {
    const body = await res.json().catch(() => ({}))
    const message: string = body?.message ?? body?.error ?? ''
    if (/codigo|code/i.test(message)) {
      return { ok: false, reason: 'duplicate_codigo' }
    }
    return { ok: false, reason: 'duplicate_serie' }
  }

  if (!res.ok) {
    throw new Error(`updateTablet: API responded ${res.status}`)
  }

  const body = await res.json()
  const raw: ExternalTablet = body.data ?? body.tablet ?? body
  return { ok: true, tablet: mapExternalTablet(raw) }
}

// ---------------------------------------------------------------------------
// Supervisor view — external API (qb_sync)
// ---------------------------------------------------------------------------

export type SupervisorTabletRow = {
  id: number
  alias: string
  serialNumber: string
  model: string
  status: 'activa' | 'inactiva' | 'mantenimiento'
  plantName: string | null
  lastInspector: string | null
  lastUsedAt: string | null
  isOnline: boolean
}

export async function getSupervisorTablets(
  accessToken: string,
  plantaId: number | null = null,
): Promise<SupervisorTabletRow[]> {
  const res = await fetch(`${baseUrl()}/qb_sync/tablets`, {
    headers: apiHeaders(accessToken),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`getSupervisorTablets: API respondió ${res.status}`)
  }

  const body = await res.json()
  const raw: ExternalTablet[] = Array.isArray(body.data) ? body.data : []

  return raw
    .filter((t) => {
      if (plantaId == null) return true
      return (t.plantId ?? t.plant_id ?? null) === plantaId
    })
    .map((t) => {
      const lastSeenRaw = t.lastSeenAt ?? t.last_seen_at ?? null
      const lastSeenDate = lastSeenRaw ? new Date(lastSeenRaw) : null
      const isOnline =
        lastSeenDate != null && Date.now() - lastSeenDate.getTime() < 10 * 60 * 1000

      // qb_sync persiste 'en_mantenimiento'; la UI usa 'mantenimiento'
      const rawStatus = t.status ?? 'inactiva'
      const status = rawStatus === 'en_mantenimiento' ? 'mantenimiento' : rawStatus
      const serialNumber = t.serialNumber ?? t.serial_number ?? ''

      return {
        id: t.id ?? 0,
        alias: t.alias ?? serialNumber,
        serialNumber,
        model: t.model ?? '',
        status: status as 'activa' | 'inactiva' | 'mantenimiento',
        plantName: t.plantName ?? t.plant_name ?? null,
        lastInspector: t.currentInspectorName ?? t.current_inspector_name ?? null,
        lastUsedAt: lastSeenDate ? formatUltimaActividad(lastSeenDate) : null,
        isOnline,
      }
    })
    .sort((a, b) => {
      const aliasCmp = a.alias.localeCompare(b.alias)
      if (aliasCmp !== 0) return aliasCmp
      return a.id - b.id
    })
}
