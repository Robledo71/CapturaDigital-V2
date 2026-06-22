'use server'

import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getCargaDeTrabajoData } from '@/back/services/cargaDeTrabajoService'
import { getOrderInventory, isIndefiniteInventoryPlant } from '@/front/lib/inventory'

export type InventoryAlert = {
  orderId: number
  consecutiveNumber: string | null
  clientName: string | null
  plantName: string
  total: number
  done: number
  pct: number
  /** true si el inventario se completó (≥100%); false si solo está por agotarse (≥80%). */
  complete: boolean
}

/**
 * Órdenes cuyo inventario alcanzó el umbral de alerta (≥80% consumido por reportes).
 * Guardado por `ordenes.ver`. Devuelve [] si no hay permiso o falla la API.
 */
export async function getInventoryAlertsAction(): Promise<InventoryAlert[]> {
  const session = await getSession()
  if (!session || !can(session, 'ordenes.ver')) return []

  let orders
  try {
    orders = await getCargaDeTrabajoData(session.accessToken)
  } catch {
    return []
  }

  return orders
    .map((o) => ({ o, inv: getOrderInventory(o.items, isIndefiniteInventoryPlant(o.plantName)) }))
    .filter(({ inv }) => inv.alert)
    .map(({ o, inv }) => ({
      orderId: o.id,
      consecutiveNumber: o.consecutiveNumber,
      clientName: o.clientName,
      plantName: o.plantName,
      total: inv.total,
      done: inv.done,
      pct: inv.pct,
      complete: inv.complete,
    }))
    .sort((a, b) => b.pct - a.pct)
}
