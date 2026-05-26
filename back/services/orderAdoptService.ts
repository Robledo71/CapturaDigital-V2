'server-only'

import { prisma } from '@/back/db/prisma'

export type AdoptOrderResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'already_adopted' }

// supervisorId was removed from the Order model in the denormalization migration.
// This function is now a no-op stub that returns ok:true when the order exists.
export async function adoptOrder(
  orderId: number,
  _supervisorId: string,
): Promise<AdoptOrderResult> {
  const exists = await prisma.order.count({ where: { id: orderId } })
  if (exists === 0) {
    return { ok: false, reason: 'not_found' }
  }
  return { ok: true }
}
