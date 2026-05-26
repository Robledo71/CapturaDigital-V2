import 'server-only'
import type { PlantaRow } from '@/shared/types/planta'
import type { PlantRecord } from '@/back/repositories/plantRepository'
import {
  findAllPlants,
  createPlant as repoCreatePlant,
  updatePlant as repoUpdatePlant,
} from '@/back/repositories/plantRepository'

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

function mapToRow(p: PlantRecord): PlantaRow {
  return {
    id: p.id,
    nombre: p.name,
    direccion: p.address ?? null,
    // External API does not return counts — default to 0.
    // The admin list page uses these for display only.
    tabletsCount: 0,
    ordenesActivas: 0,
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function getAllPlantas(accessToken: string): Promise<PlantaRow[]> {
  const rows = await findAllPlants(accessToken)
  return rows.map(mapToRow)
}

export type CreatePlantaInput = {
  nombre: string
  direccion?: string
}

export async function createPlanta(
  input: CreatePlantaInput,
  accessToken: string,
): Promise<{ ok: true; planta: PlantaRow }> {
  const record = await repoCreatePlant(
    { name: input.nombre, address: input.direccion },
    accessToken,
  )
  return { ok: true, planta: mapToRow(record) }
}

export type UpdatePlantaInput = {
  id: number
  nombre: string
  direccion?: string | null
}

export type UpdatePlantaResult =
  | { ok: true; planta: PlantaRow }
  | { ok: false; reason: 'not_found' }

export async function updatePlanta(
  input: UpdatePlantaInput,
  accessToken: string,
): Promise<UpdatePlantaResult> {
  try {
    const record = await repoUpdatePlant(
      input.id,
      { name: input.nombre, address: input.direccion },
      accessToken,
    )
    return { ok: true, planta: mapToRow(record) }
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      return { ok: false, reason: 'not_found' }
    }
    throw err
  }
}
