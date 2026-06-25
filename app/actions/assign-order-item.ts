'use server'

import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { assignItemToTablet } from '@/back/services/inspectionSessionService'
import type { OrderItemTree, OtherItemEntry } from '@/back/services/inspectionSessionService'

export type AssignOrderItemState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined

function getStr(formData: FormData, key: string): string {
  return (formData.get(key) as string | null) ?? ''
}

function mapOrderState(raw: string): 'open' | 'closed' | 'cancelled' {
  if (raw === 'cerrada' || raw === 'closed') return 'closed'
  if (raw === 'cancelled' || raw === 'cancelada') return 'cancelled'
  return 'open' // 'abierta', 'open', o cualquier otro valor → open
}

/**
 * Parse the optional `otherItems` JSON field from formData.
 * Returns undefined if the field is absent, empty, or malformed.
 */
function parseOtherItems(formData: FormData): OtherItemEntry[] | undefined {
  const raw = getStr(formData, 'otherItems')
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0) return undefined
    return parsed as OtherItemEntry[]
  } catch {
    return undefined
  }
}

/**
 * Build the QB pass-through tree (order + quotation + orderItem) from the form.
 * Form-field names (qb_*) → qb_sync wire field names. This is form decoding, so
 * it lives in the action, not in the service/repository.
 */
function buildTree(formData: FormData): OrderItemTree {
  const otherItems = parseOtherItems(formData)
  return {
    order: {
      consecutive_number:   getStr(formData, 'qb_order_consecutive'),
      state:                mapOrderState(getStr(formData, 'qb_order_state')),
      client_name:          getStr(formData, 'qb_order_client_name'),
      client_contact_name:  getStr(formData, 'qb_order_client_contact_name'),
      client_contact_email: getStr(formData, 'qb_order_client_contact_email'),
      service_type_name:    getStr(formData, 'qb_order_service_type_name'),
      service_type_detail:  getStr(formData, 'qb_order_service_type_detail'),
      pieces_per_hour:      Number(getStr(formData, 'qb_order_pieces_per_hour') || '0'),
      authorized_hours:     Number(getStr(formData, 'qb_order_authorized_hours') || '0'),
      price_per_hour:       Number(getStr(formData, 'qb_order_price_per_hour') || '0'),
      language:             getStr(formData, 'qb_order_language'),
      user_name:            getStr(formData, 'qb_order_user_name'),
      region_name:          getStr(formData, 'qb_order_region_name'),
      plant_name:           getStr(formData, 'qb_order_plant_name'),
    },
    quotation: {
      consecutive_number:    getStr(formData, 'qb_quotation_consecutive'),
      client_email:          getStr(formData, 'qb_quotation_client_email'),
      status:                getStr(formData, 'qb_quotation_status'),
      purchase_order_number: getStr(formData, 'qb_quotation_purchase_order_number'),
      contact_emails:        getStr(formData, 'qb_quotation_contact_emails'),
      order_user_name:       getStr(formData, 'qb_quotation_order_user_name'),
    },
    orderItem: {
      part_number:    getStr(formData, 'qb_item_part_number') || null,
      part_name:      getStr(formData, 'qb_item_part_name'),
      inventory:      Number(getStr(formData, 'qb_item_inventory') || '0'),
      inventory_done: Number(getStr(formData, 'qb_item_inventory_done') || '0'),
      plant_name:     getStr(formData, 'qb_item_plant_name'),
      incidents:      getStr(formData, 'qb_item_incidents'),
    },
    ...(otherItems ? { otherItems } : {}),
  }
}

export async function assignOrderItemAction(
  _state: AssignOrderItemState,
  formData: FormData,
): Promise<AssignOrderItemState> {
  // 1. Sesión / autorización
  const session = await getSession()
  if (!session) return { ok: false, error: 'Sesión expirada. Por favor inicia sesión nuevamente.' }
  if (!can(session, 'ordenes.asignar')) {
    return { ok: false, error: 'No autorizado.' }
  }

  // 2. Tablet — el value del select es "dbId:codigoTablet"
  const tabletValue = String(formData.get('tabletId') ?? '')
  const colonIdx = tabletValue.indexOf(':')
  if (colonIdx === -1) return { ok: false, error: 'Selecciona una tablet.' }
  const codigoTablet = tabletValue.slice(colonIdx + 1)
  if (!codigoTablet) return { ok: false, error: 'Selecciona una tablet.' }

  // 3. ¿Item nuevo (desde QB, orderItemId === 0) o ya existente?
  const orderItemId = Number(formData.get('orderItemId') ?? '0')
  let tree: OrderItemTree | undefined
  if (orderItemId === 0) {
    if (!getStr(formData, 'qb_order_id') || !getStr(formData, 'qb_quotation_id')) {
      return { ok: false, error: 'Datos de la orden incompletos. Busca la cotización nuevamente.' }
    }
    tree = buildTree(formData)
  }

  // 4. Delegar la lógica de asignación al service
  return assignItemToTablet(
    {
      orderItemId,
      codigoTablet,
      supervisorCode: session.codigoEmpleado,
      fechaInicio: new Date().toISOString(),
      tree,
    },
    session.accessToken,
  )
}
