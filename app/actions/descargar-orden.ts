'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { descargarOrden } from '@/back/services/inspectionSessionService'
import { buildTree } from './_orderTree'

export type DescargarOrdenState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined

function getStr(formData: FormData, key: string): string {
  return (formData.get(key) as string | null) ?? ''
}

// Todas las rutas que renderizan `CargaDeTrabajoPage` — se revalidan tras un
// descargar exitoso para que la orden persistida aparezca sin refrescar manual.
const CARGA_TRABAJO_PATHS = [
  '/supervisor/carga-trabajo',
  '/superusuario/carga-trabajo',
  '/capturacion/carga-trabajo',
  '/servicio-cliente/carga-trabajo',
  '/gerente/ordenes',
]

/**
 * Persiste (upsert) el árbol Order → Quotation → OrderItem completo de una
 * orden SIN asignar inspectores — "Descargar orden". Reusa el mismo parseo de
 * formulario (`buildTree`) que `assignOrderItemAction`, ya que el modal de
 * detalle embebe los mismos campos ocultos `qb_*` para ambos flujos.
 */
export async function descargarOrdenAction(
  _state: DescargarOrdenState,
  formData: FormData,
): Promise<DescargarOrdenState> {
  // 1. Sesión / autorización — mismo permiso que el upsert del back (importar cotizaciones).
  const session = await getSession()
  if (!session) return { ok: false, error: 'Sesión expirada. Por favor inicia sesión nuevamente.' }
  if (!can(session, 'cotizaciones.importar')) {
    return { ok: false, error: 'No autorizado.' }
  }

  // 2. Árbol mínimo requerido
  if (!getStr(formData, 'qb_order_consecutive') || !getStr(formData, 'qb_quotation_consecutive')) {
    return { ok: false, error: 'Datos de la orden incompletos. Busca la cotización nuevamente.' }
  }
  const tree = buildTree(formData)

  // 3. Delegar al service
  const result = await descargarOrden(tree, session.accessToken)

  if (result.ok) {
    for (const path of CARGA_TRABAJO_PATHS) revalidatePath(path)
  }

  return result
}
