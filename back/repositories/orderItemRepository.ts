// TODO Fase 2: OrderItem schema cambió — tabletId, status, assignedAt, orderId eliminados.
// Funciones que dependen de campos eliminados retornan vacío.
import 'server-only'
import { prisma } from '@/back/db/prisma'

/** Find a single OrderItem by id, including its quotation. */
export async function findItemById(id: number) {
  return prisma.orderItem.findUnique({
    where: { id },
    include: {
      quotation: {
        select: {
          id: true,
          consecutiveNumber: true,
          orderId: true,
          order: {
            select: {
              id: true,
              consecutiveNumber: true,
              state: true,
              client: { select: { name: true } },
              plant: { select: { name: true } },
            },
          },
        },
      },
    },
  })
}

/** Find all items assigned to a tablet (stub — tabletId field removed).
 *  TODO Fase 2: reimplementar con InspectionSession. */
export async function findItemsByTablet(_tabletId: number) {
  return []
}

/** Update the status of an OrderItem — stub (status field removed).
 *  TODO Fase 2: reimplementar. */
export async function updateItemStatus(
  _id: number,
  _status: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _tx?: any,
) {
  return null
}
