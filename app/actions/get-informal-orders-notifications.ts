'use server'

import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getInformalOrders } from '@/back/services/informalOrdersService'

export type InformalOrderNotif = {
  ordenInformalId: number
  itemOrdenInformalId: number
  tipoOrden: 'OV' | 'OA'
  clienteNombre: string | null
  plantaNombre: string | null
  numeroParte: string
  solicitanteNombre: string | null
  fechaCreado: string | null
}

/**
 * Órdenes informales visibles para el usuario (una por item), para alimentar la
 * campana de notificaciones de servicio al cliente. Guardado por
 * `ordenes_informales.ver`. Devuelve [] si no hay permiso o falla la API.
 */
export async function getInformalOrdersNotificationsAction(): Promise<InformalOrderNotif[]> {
  const session = await getSession()
  if (!session || !can(session, 'ordenes_informales.ver')) return []

  try {
    const orders = await getInformalOrders(session.accessToken)
    return orders
      .map((o) => ({
        ordenInformalId: o.ordenInformalId,
        itemOrdenInformalId: o.itemOrdenInformalId,
        tipoOrden: o.tipoOrden,
        clienteNombre: o.clienteNombre,
        plantaNombre: o.plantaNombre,
        numeroParte: o.numeroParte,
        solicitanteNombre: o.solicitanteNombre,
        fechaCreado: o.fechaCreado,
      }))
      // Más recientes primero (por fecha de creación de la orden informal).
      .sort((a, b) => new Date(b.fechaCreado ?? 0).getTime() - new Date(a.fechaCreado ?? 0).getTime())
  } catch {
    return []
  }
}
