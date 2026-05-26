import 'server-only'

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
}

export type PlantRecord = {
  id: number
  name: string
  address: string | null
}

function mapExternalPlant(p: ExternalPlant): PlantRecord {
  return {
    id: p.id ?? p.id_planta ?? 0,
    name: p.name ?? '',
    address: p.address ?? null,
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
