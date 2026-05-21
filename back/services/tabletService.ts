import 'server-only'
import { Prisma } from '@prisma/client'
import type { TabletRow } from '@/shared/types/tablet'
import {
  findAllTablets,
  findTabletById,
  findTabletBySerial,
  createTablet as repoCreateTablet,
  updateTablet as repoUpdateTablet,
} from '@/back/repositories/tabletRepository'

type DbTabletWithPlant = Awaited<ReturnType<typeof findAllTablets>>[number]

function formatUltimaActividad(lastSeenAt: Date | null): string {
  if (!lastSeenAt) return 'Nunca'

  const diffSeconds = Math.floor((Date.now() - lastSeenAt.getTime()) / 1000)

  if (diffSeconds < 60) return 'hace un momento'
  if (diffSeconds < 3600) return `hace ${Math.floor(diffSeconds / 60)} min`
  if (diffSeconds < 86400) return `hace ${Math.floor(diffSeconds / 3600)} h`
  return `hace ${Math.floor(diffSeconds / 86400)} días`
}

const formatRelativeTime = formatUltimaActividad

function mapToRow(dbTablet: DbTabletWithPlant): TabletRow {
  return {
    id: dbTablet.id,
    alias: dbTablet.alias ?? null,
    modelo: dbTablet.model,
    serie: dbTablet.serialNumber,
    plantaId: dbTablet.plantId,
    plantaNombre: dbTablet.plant?.name ?? null,
    inspector: dbTablet.currentInspectorName ?? null,
    estado: dbTablet.status,
    ultimaActividad: formatUltimaActividad(dbTablet.lastSeenAt),
    notes: dbTablet.notes ?? null,
  }
}

export async function getAllTablets(): Promise<TabletRow[]> {
  const rows = await findAllTablets()
  return rows.map(mapToRow)
}

export type CreateTabletInput = {
  modelo: string
  serie: string
  alias?: string
  plantaId?: number
  notes?: string
}

export type CreateTabletResult =
  | { ok: true; tablet: TabletRow }
  | { ok: false; reason: 'duplicate_serie' }

export async function createTablet(
  input: CreateTabletInput,
): Promise<CreateTabletResult> {
  try {
    const dbTablet = await repoCreateTablet({
      model: input.modelo,
      serialNumber: input.serie,
      alias: input.alias,
      plantId: input.plantaId,
      notes: input.notes,
    })

    // Re-fetch with plant relation for a consistent shape
    const all = await findAllTablets()
    const withPlant = all.find((t) => t.id === dbTablet.id)

    const tablet: TabletRow = withPlant
      ? mapToRow(withPlant)
      : {
          id: dbTablet.id,
          alias: dbTablet.alias ?? null,
          modelo: dbTablet.model,
          serie: dbTablet.serialNumber,
          plantaId: dbTablet.plantId,
          plantaNombre: null,
          inspector: dbTablet.currentInspectorName ?? null,
          estado: dbTablet.status,
          ultimaActividad: formatUltimaActividad(dbTablet.lastSeenAt),
          notes: dbTablet.notes ?? null,
        }

    return { ok: true, tablet }
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return { ok: false, reason: 'duplicate_serie' }
    }
    throw err
  }
}

export type UpdateTabletInput = {
  id: number
  modelo: string
  serie: string
  alias?: string | null
  plantaId?: number | null
  notes?: string | null
  estado?: string
}

export type UpdateTabletResult =
  | { ok: true; tablet: TabletRow }
  | { ok: false; reason: 'not_found' | 'duplicate_serie' }

export async function updateTablet(
  input: UpdateTabletInput,
): Promise<UpdateTabletResult> {
  const existing = await findTabletById(input.id)
  if (!existing) {
    return { ok: false, reason: 'not_found' }
  }

  try {
    await repoUpdateTablet(input.id, {
      model: input.modelo,
      serialNumber: input.serie,
      alias: input.alias,
      plantId: input.plantaId,
      notes: input.notes,
      status: input.estado,
    })

    // Re-fetch with plant relation to return consistent shape
    const all = await findAllTablets()
    const updated = all.find((t) => t.id === input.id)

    if (!updated) {
      return { ok: false, reason: 'not_found' }
    }

    return { ok: true, tablet: mapToRow(updated) }
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2025'
    ) {
      return { ok: false, reason: 'not_found' }
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return { ok: false, reason: 'duplicate_serie' }
    }
    throw err
  }
}

// ---------------------------------------------------------------------------
// Supervisor view
// ---------------------------------------------------------------------------

import { prisma } from '@/back/db/prisma'

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

export async function getSupervisorTablets(supervisorId: string): Promise<SupervisorTabletRow[]> {
  // Obtener los plantIds de las órdenes del supervisor
  const orderPlants = await prisma.order.findMany({
    where: { supervisorId },
    select: { plantId: true },
    distinct: ['plantId'],
  })
  const plantIds = orderPlants.map((o) => o.plantId)

  const tablets = await prisma.tablet.findMany({
    where: plantIds.length > 0 ? { plantId: { in: plantIds } } : {},
    include: {
      plant: true,
      sessions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: [{ alias: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
  })

  return tablets.map((t) => {
    const lastSession = t.sessions[0]
    const lastInspector = t.currentInspectorName ?? lastSession?.operadores ?? null
    const isOnline =
      t.lastSeenAt != null &&
      Date.now() - new Date(t.lastSeenAt).getTime() < 10 * 60 * 1000

    return {
      id: t.id,
      alias: t.alias ?? t.serialNumber,
      serialNumber: t.serialNumber,
      model: t.model,
      status: t.status as 'activa' | 'inactiva' | 'mantenimiento',
      plantName: t.plant?.name ?? null,
      lastInspector,
      lastUsedAt: t.lastSeenAt ? formatRelativeTime(t.lastSeenAt) : null,
      isOnline,
    }
  })
}
