'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getInformalOrders } from '@/back/services/informalOrdersService'
import { promoverOrdenInformal } from '@/back/services/promoteService'
import type { InformalOrderRow } from '@/shared/types/informalOrder'

export type PromoverOrdenState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined

// Todas las rutas que renderizan `CargaDeTrabajoPage` — se revalidan tras
// promover exitosamente para reflejar los reportes movidos a la orden formal.
const CARGA_TRABAJO_PATHS = [
  '/supervisor/carga-trabajo',
  '/superusuario/carga-trabajo',
  '/capturacion/carga-trabajo',
  '/servicio-cliente/carga-trabajo',
  '/gerente/ordenes',
]

/**
 * Órdenes informales disponibles para promover a una orden formal — gateado
 * por `reportes_informales.promover`. Devuelve [] si no hay permiso o falla la
 * API (mismo patrón que `getInformalOrdersNotificationsAction`).
 */
export async function getOrdenesInformalesParaPromoverAction(): Promise<InformalOrderRow[]> {
  const session = await getSession()
  if (!session || !can(session, 'reportes_informales.promover')) return []

  try {
    return await getInformalOrders(session.accessToken)
  } catch {
    return []
  }
}

function getNumber(formData: FormData, key: string): number {
  return Number((formData.get(key) as string | null) ?? '')
}

/**
 * Promueve una orden informal (identificada por su item) a una orden formal
 * ya descargada/persistida. Ver `back/services/promoteService.ts` para el
 * contrato asumido del endpoint.
 */
export async function promoverOrdenInformalAction(
  _state: PromoverOrdenState,
  formData: FormData,
): Promise<PromoverOrdenState> {
  // 1. Sesión / autorización
  const session = await getSession()
  if (!session) return { ok: false, error: 'Sesión expirada. Por favor inicia sesión nuevamente.' }
  if (!can(session, 'reportes_informales.promover')) {
    return { ok: false, error: 'No autorizado.' }
  }

  // 2. Datos del formulario — item informal origen + item formal destino
  const itemOrdenInformalId = getNumber(formData, 'itemOrdenInformalId')
  const itemOrdenId = getNumber(formData, 'itemOrdenId')
  if (
    !Number.isFinite(itemOrdenInformalId) || itemOrdenInformalId <= 0 ||
    !Number.isFinite(itemOrdenId) || itemOrdenId <= 0
  ) {
    return { ok: false, error: 'Datos incompletos.' }
  }

  // 3. Delegar al service
  const result = await promoverOrdenInformal({ itemOrdenInformalId, itemOrdenId }, session.accessToken)

  if (!result.ok) return { ok: false, error: result.error }

  for (const path of CARGA_TRABAJO_PATHS) revalidatePath(path)
  return { ok: true }
}
