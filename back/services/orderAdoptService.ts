'server-only'

import { prisma } from '@/back/db/prisma'

export type AdoptOrderResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'already_adopted' }

export async function adoptOrder(
  orderId: number,
  supervisorId: string,
): Promise<AdoptOrderResult> {
  const result = await prisma.order.updateMany({
    where: { id: orderId, supervisorId: null },
    data: { supervisorId },
  })

  if (result.count === 0) {
    const exists = await prisma.order.count({ where: { id: orderId } })
    return exists > 0
      ? { ok: false, reason: 'already_adopted' }
      : { ok: false, reason: 'not_found' }
  }

  return { ok: true }
}
