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

export type CreateTabletData = {
  model: string
  serialNumber: string
  alias?: string
  plantId?: number
  notes?: string
}

export async function createTablet(data: CreateTabletData) {
  return prisma.tablet.create({ data })
}

export type UpdateTabletData = {
  model?: string
  serialNumber?: string
  alias?: string | null
  plantId?: number | null
  notes?: string | null
  status?: string
}

export async function updateTablet(id: number, data: UpdateTabletData) {
  return prisma.tablet.update({ where: { id }, data })
}
