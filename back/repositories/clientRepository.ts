import 'server-only'
import { prisma } from '@/back/db/prisma'

export async function findAllClients() {
  return prisma.client.findMany({
    include: {
      _count: {
        select: {
          orders: { where: { status: 'abierta' } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function findClientById(id: number) {
  return prisma.client.findUnique({ where: { id } })
}

export type CreateClientData = {
  name: string
  address?: string
  requirePurchaseOrder: boolean
}

export async function createClient(data: CreateClientData) {
  return prisma.client.create({ data })
}

export type UpdateClientData = {
  name?: string
  address?: string | null
  requirePurchaseOrder?: boolean
}

export async function updateClient(id: number, data: UpdateClientData) {
  return prisma.client.update({ where: { id }, data })
}
