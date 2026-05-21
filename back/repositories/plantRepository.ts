import 'server-only'
import { prisma } from '@/back/db/prisma'

export async function findAllPlants() {
  return prisma.plant.findMany({
    include: {
      _count: {
        select: {
          tablets: true,
          orders: { where: { status: 'abierta' } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function findPlantById(id: number) {
  return prisma.plant.findUnique({ where: { id } })
}

export type CreatePlantData = {
  name: string
  address?: string
}

export async function createPlant(data: CreatePlantData) {
  return prisma.plant.create({ data })
}

export type UpdatePlantData = {
  name?: string
  address?: string | null
}

export async function updatePlant(id: number, data: UpdatePlantData) {
  return prisma.plant.update({ where: { id }, data })
}
