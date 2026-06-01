'use server'

import { getSession } from '@/back/services/session'

export type AssignOrderItemState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined

function getStr(formData: FormData, key: string): string {
  return (formData.get(key) as string | null) ?? ''
}

export async function assignOrderItemAction(
  _state: AssignOrderItemState,
  formData: FormData,
): Promise<AssignOrderItemState> {
  // 1. Sesión
  const session = await getSession()
  if (!session) return { ok: false, error: 'Sesión expirada. Por favor inicia sesión nuevamente.' }
  if (session.rol !== 'supervisor' && session.rol !== 'admin') {
    return { ok: false, error: 'No autorizado.' }
  }

  // 2. Tablet — el value del select es "dbId:codigoTablet"
  const tabletValue = String(formData.get('tabletId') ?? '')
  const colonIdx = tabletValue.indexOf(':')
  if (colonIdx === -1) return { ok: false, error: 'Selecciona una tablet.' }
  const codigoTablet = tabletValue.slice(colonIdx + 1)
  if (!codigoTablet) return { ok: false, error: 'Selecciona una tablet.' }

  const BASE = process.env.QSYNC_API_URL ?? 'http://localhost:3001'
  const headers = {
    'Content-Type': 'application/json',
    'X-App-Token': process.env.X_APP_TOKEN ?? '',
    'Authorization': `Bearer ${session.accessToken}`,
  }

  // 3. ¿Es un item nuevo (desde QB) o uno ya existente?
  const rawOrderItemId = Number(formData.get('orderItemId') ?? '0')
  const isNewItem = rawOrderItemId === 0

  let res: Response
  try {
    if (isNewItem) {
      // Item nuevo: qb_sync hace el upsert completo Order→Quotation→OrderItem→Session
      const qbOrderId = getStr(formData, 'qb_order_id')
      const qbQuotationId = getStr(formData, 'qb_quotation_id')
      if (!qbOrderId || !qbQuotationId) {
        return { ok: false, error: 'Datos de la orden incompletos. Busca la cotización nuevamente.' }
      }

      const body = {
        order: {
          consecutive_number:    getStr(formData, 'qb_order_consecutive'),
          state:                 getStr(formData, 'qb_order_state'),
          client_name:           getStr(formData, 'qb_order_client_name'),
          client_contact_name:   getStr(formData, 'qb_order_client_contact_name'),
          client_contact_email:  getStr(formData, 'qb_order_client_contact_email'),
          service_type_name:     getStr(formData, 'qb_order_service_type_name'),
          service_type_detail:   getStr(formData, 'qb_order_service_type_detail'),
          pieces_per_hour:       Number(getStr(formData, 'qb_order_pieces_per_hour') || '0'),
          authorized_hours:      Number(getStr(formData, 'qb_order_authorized_hours') || '0'),
          price_per_hour:        Number(getStr(formData, 'qb_order_price_per_hour') || '0'),
          language:              getStr(formData, 'qb_order_language'),
          user_name:             getStr(formData, 'qb_order_user_name'),
          region_name:           getStr(formData, 'qb_order_region_name'),
          plant_name:            getStr(formData, 'qb_order_plant_name'),
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
        inspectionSession: {
          id_supervisor: session.codigoEmpleado,
          id_tablet:     codigoTablet,
          status:        'assigned',
          fecha_inicio:  new Date().toISOString(),
        },
      }

      res = await fetch(`${BASE}/qb_sync/order-items`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
    } else {
      // Item existente: solo crea la sesión
      res = await fetch(`${BASE}/qb_sync/order-items/${rawOrderItemId}/session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id_supervisor: session.codigoEmpleado,
          id_tablet:     codigoTablet,
          status:        'assigned',
          fecha_inicio:  new Date().toISOString(),
        }),
      })
    }
  } catch {
    return { ok: false, error: 'No se pudo conectar con el servidor. Intenta nuevamente.' }
  }

  const body = await res.json().catch(() => ({}))
  if (!res.ok || (body as { success?: boolean }).success === false) {
    const msg = (body as { message?: string }).message
    // Mapear códigos HTTP a mensajes amigables
    if (res.status === 409) {
      return { ok: false, error: msg ?? 'Este item ya tiene una tablet asignada.' }
    }
    return { ok: false, error: msg ?? 'Error al asignar la tablet.' }
  }

  return { ok: true }
}
