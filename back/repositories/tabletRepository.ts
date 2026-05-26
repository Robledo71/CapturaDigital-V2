import 'server-only'
import { prisma } from '@/back/db/prisma'

export async function findAllTablets() {
  return prisma.tablet.findMany({
    include: {
      plant: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function findTabletById(id: number) {
  return prisma.tablet.findUnique({ where: { id } })
}

export async function findTabletBySerial(serialNumber: string) {
  return prisma.tablet.findUnique({ where: { serialNumber } })
}

export async function findTabletByCodigo(codigoTablet: string) {
  return prisma.tablet.findUnique({ where: { codigoTablet } })
}

export type CreateTabletData = {
  model: string
  serialNumber: string
  codigoTablet: string
  alias?: string
  plantId?: number | null
  notes?: string
}

export async function createTablet(data: CreateTabletData) {
  return prisma.tablet.create({
    data: {
      model: data.model,
      serialNumber: data.serialNumber,
      codigoTablet: data.codigoTablet,
      alias: data.alias,
      notes: data.notes,
      status: 'activa',
      ...(data.plantId != null ? { plant: { connect: { id: data.plantId } } } : {}),
    },
  })
}

export type UpdateTabletData = {
  model?: string
  serialNumber?: string
  codigoTablet?: string
  alias?: string | null
  plantId?: number | null
  notes?: string | null
  status?: string
}

export async function updateTablet(id: number, data: UpdateTabletData) {
  return prisma.tablet.update({ where: { id }, data })
}
