'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/back/services/session'
import { adoptOrder } from '@/back/services/orderAdoptService'

export type AdoptOrderState = {
  ok?: true
  error?: string
}

export async function adoptOrderAction(
  _state: AdoptOrderState,
  formData: FormData,
): Promise<AdoptOrderState> {
  const raw = Number(formData.get('orderId'))
  if (!Number.isInteger(raw) || raw <= 0) return { error: 'Orden inválida' }

  const session = await getSession()
  if (!session || session.rol !== 'supervisor') return { error: 'No autorizado' }

  const result = await adoptOrder(raw, session.userId)

  if (!result.ok) {
    const errors: Record<typeof result.reason, string> = {
      not_found: 'Orden no encontrada',
      already_adopted: 'Esta orden ya fue adoptada por otro supervisor',
    }
    return { error: errors[result.reason] }
  }

  revalidatePath('/supervisor/reportes')
  revalidatePath('/supervisor')

  return { ok: true }
}
