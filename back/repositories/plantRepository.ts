import 'server-only'
import type { RegionRow } from '@/shared/types/planta'

// ---------------------------------------------------------------------------
// External API shape
// ---------------------------------------------------------------------------

type ExternalPlant = {
  id?: number
  id_planta?: number
  name?: string
  address?: string | null
  regionId?: number | null
  region_id?: number | null
  nombre_region?: string | null
}

type ExternalRegion = {
  id?: number
  nombre?: string
}

export type PlantRecord = {
  id: number
  name: string
  address: string | null
  regionId: number | null
  nombreRegion: string | null
}

function mapExternalPlant(p: ExternalPlant): PlantRecord {
  return {
    id: p.id ?? p.id_planta ?? 0,
    name: p.name ?? '',
    address: p.address ?? null,
    regionId: p.region_id ?? p.regionId ?? null,
    nombreRegion: p.nombre_region ?? null,
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
// Repository functions
// ---------------------------------------------------------------------------

export async function findAllPlants(accessToken: string): Promise<PlantRecord[]> {
  const res = await fetch(`${baseUrl()}/qb_sync/plants`, {
    headers: apiHeaders(accessToken),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`findAllPlants: API responded ${res.status}`)
  }

  const body = await res.json()
  const data: ExternalPlant[] = Array.isArray(body.data) ? body.data : []
  return data.map(mapExternalPlant)
}

export async function findAllRegiones(accessToken: string): Promise<RegionRow[]> {
  const res = await fetch(`${baseUrl()}/qb_sync/plants/regiones`, {
    headers: apiHeaders(accessToken),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`findAllRegiones: API responded ${res.status}`)
  }

  const body = await res.json()
  const data: ExternalRegion[] = Array.isArray(body.data) ? body.data : []
  return data.map((r) => ({ id: r.id ?? 0, nombre: r.nombre ?? '' }))
}

export type CreatePlantData = {
  name: string
  address?: string
  regionId?: number
}

export async function createPlant(
  data: CreatePlantData,
  accessToken: string,
): Promise<PlantRecord> {
  const res = await fetch(`${baseUrl()}/qb_sync/plants`, {
    method: 'POST',
    headers: apiHeaders(accessToken),
    body: JSON.stringify({
      name: data.name,
      address: data.address,
      region_id: data.regionId,
    }),
  })

  if (!res.ok) {
    throw new Error(`createPlant: API responded ${res.status}`)
  }

  const body = await res.json()
  const raw: ExternalPlant = body.data ?? body.plant ?? body
  return mapExternalPlant(raw)
}

export type UpdatePlantData = {
  name?: string
  address?: string | null
  regionId?: number
}

export async function updatePlant(
  id: number,
  data: UpdatePlantData,
  accessToken: string,
): Promise<PlantRecord> {
  const res = await fetch(`${baseUrl()}/qb_sync/plants/${id}`, {
    method: 'PUT',
    headers: apiHeaders(accessToken),
    body: JSON.stringify({
      name: data.name,
      address: data.address,
      region_id: data.regionId,
    }),
  })

  if (res.status === 404) {
    throw new Error(`updatePlant: plant ${id} not found`)
  }

  if (!res.ok) {
    throw new Error(`updatePlant: API responded ${res.status}`)
  }

  const body = await res.json()
  const raw: ExternalPlant = body.data ?? body.plant ?? body
  return mapExternalPlant(raw)
}

export type DeletePlantResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'in_use' | 'error' }

export async function deletePlant(
  id: number,
  accessToken: string,
): Promise<DeletePlantResult> {
  const res = await fetch(`${baseUrl()}/qb_sync/plants/${id}`, {
    method: 'DELETE',
    headers: apiHeaders(accessToken),
  })

  if (res.status === 404) return { ok: false, reason: 'not_found' }
  // 409 = la planta tiene recursos asignados que impiden su eliminación (regla de negocio del backend).
  if (res.status === 409) return { ok: false, reason: 'in_use' }
  if (!res.ok) return { ok: false, reason: 'error' }
  return { ok: true }
}
