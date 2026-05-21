import 'server-only'
import { Prisma } from '@prisma/client'
import type { PlantaRow } from '@/shared/types/planta'
import {
  findAllPlants,
  findPlantById,
  createPlant as repoCreatePlant,
  updatePlant as repoUpdatePlant,
} from '@/back/repositories/plantRepository'

type DbPlantWithCount = Awaited<ReturnType<typeof findAllPlants>>[number]

function mapToRow(dbPlant: DbPlantWithCount): PlantaRow {
  return {
    id: dbPlant.id,
    nombre: dbPlant.name,
    direccion: dbPlant.address ?? null,
    tabletsCount: dbPlant._count.tablets,
    ordenesActivas: dbPlant._count.orders,
  }
}

export async function getAllPlantas(): Promise<PlantaRow[]> {
  const rows = await findAllPlants()
  return rows.map(mapToRow)
}

export type CreatePlantaInput = {
  nombre: string
  direccion?: string
}

export async function createPlanta(
  input: CreatePlantaInput,
): Promise<{ ok: true; planta: PlantaRow }> {
  const dbPlant = await repoCreatePlant({
    name: input.nombre,
    address: input.direccion,
  })

  // Re-fetch with _count for a consistent shape
  const withCount = await findAllPlants().then((all) =>
    all.find((p) => p.id === dbPlant.id),
  )

  const planta: PlantaRow = withCount
    ? mapToRow(withCount)
    : {
        id: dbPlant.id,
        nombre: dbPlant.name,
        direccion: dbPlant.address ?? null,
        tabletsCount: 0,
        ordenesActivas: 0,
      }

  return { ok: true, planta }
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
): Promise<UpdatePlantaResult> {
  const existing = await findPlantById(input.id)
  if (!existing) {
    return { ok: false, reason: 'not_found' }
  }

  try {
    await repoUpdatePlant(input.id, {
      name: input.nombre,
      address: input.direccion,
    })

    // Re-fetch with _count to return accurate counts
    const all = await findAllPlants()
    const updated = all.find((p) => p.id === input.id)

    if (!updated) {
      return { ok: false, reason: 'not_found' }
    }

    return { ok: true, planta: mapToRow(updated) }
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2025'
    ) {
      return { ok: false, reason: 'not_found' }
    }
    throw err
  }
}
