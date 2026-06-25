'use server'

import { z } from 'zod'
import { searchOrder, searchCotizaciones, type QBOrderData, type QBCotizacion, type QBOrderItem } from '@/back/services/qb-api'
import { type OrderWorkload, type OrderItemWorkload, type QuotationSummary, getOrderWorkloadById } from '@/back/services/cargaDeTrabajoService'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { orderExists } from '@/back/services/qb_sync-api'

const Schema = z.object({
  orden: z.string().min(1, 'El número de orden es requerido').trim(),
})

export type ImportCotizacionState =
  | { ok: true; order: OrderWorkload }
  | { ok: false; error: string }
  | undefined

const ERROR_MESSAGES: Record<string, string> = {
  not_found: 'Orden no encontrada en QB.',
  auth: 'Error de autenticación con QB. Contacta al administrador.',
  rate_limit: 'Límite de peticiones QB alcanzado. Intenta en 15 minutos.',
  validation: 'Número de orden inválido.',
  server: 'Error del servidor QB. Intenta nuevamente.',
  network: 'Sin conexión con QB. Revisa tu red.',
}

// QB API returns order_items in one of four shapes (mirrored from qb-sync.ts).
function toItemArray(value: unknown): QBOrderItem[] {
  if (value === null || value === undefined || typeof value !== 'object') return []
  if (Array.isArray(value)) {
    return (value as unknown[]).filter(
      (v): v is QBOrderItem => v !== null && typeof v === 'object'
    )
  }
  const obj = value as Record<string, unknown>
  if ('part_number' in obj || 'inventory' in obj) {
    if (obj.part_number === null && obj.inventory === null) return []
    return [obj as unknown as QBOrderItem]
  }
  return (Object.values(obj) as unknown[]).filter(
    (v): v is QBOrderItem => v !== null && typeof v === 'object'
  )
}

/**
 * Builds an OrderWorkload purely from QB API data — NO database writes.
 * All items start with status 'pending' and no assigned tablet because
 * the assignment hasn't happened yet.
 */
function buildOrderWorkloadFromQB(
  qbOrder: QBOrderData,
  rawCotizaciones: QBCotizacion[],
): OrderWorkload {
  // SysQB puede devolver la MISMA cotización más de una vez. Si no la deduplicamos,
  // tanto las cotizaciones (key q.id) como sus items se renderizarían duplicados
  // (warning de React "two children with the same key").
  const seenCotIds = new Set<number>()
  const cotizaciones = rawCotizaciones.filter((cotizacion) => {
    const cid = Number(cotizacion.id)
    if (seenCotIds.has(cid)) return false
    seenCotIds.add(cid)
    return true
  })

  const items: OrderItemWorkload[] = cotizaciones.flatMap((cotizacion) =>
    toItemArray(cotizacion.order_items).map((item) => ({
      // id is 0 as a sentinel — the real DB id is assigned after the upsert in assign-order-item
      id: 0,
      partNumber: item.part_number ?? '—',
      partName: item.part_name ?? '—',
      status: 'pending',
      inventario: item.inventory !== '' && item.inventory !== null ? Number(item.inventory) : 0,
      inventarioTerminado: item.inventory_done !== '' && item.inventory_done !== null ? Number(item.inventory_done) : 0,
      assignedAt: null,
      assignedTablet: null,
      quotationConsecutive: cotizacion.consecutive_number ?? null,
      hasSubmittedReport: false,
      // QB items are never persisted yet — no documents uploaded
      hoe: null,
      arranqueSeguro: null,
    }))
  )

  const quotations: QuotationSummary[] = cotizaciones.map((cotizacion) => ({
    id: Number(cotizacion.id),
    consecutiveNumber: cotizacion.consecutive_number ?? null,
    status: cotizacion.status ?? null,
    total: 0,
    clientEmail: cotizacion.client_email ?? null,
    purchaseOrderNumber: cotizacion.purchase_order_number ?? null,
    contactEmails: cotizacion.contact_emails ?? null,
    orderUserName: cotizacion.order_user_name ?? null,
    orderConsecutiveNumber: cotizacion.order_consecutive_number ?? null,
  }))

  const firstItem = items[0]

  return {
    id: Number(qbOrder.id),
    consecutiveNumber: qbOrder.consecutive_number ?? null,
    clientName: qbOrder.client_name ?? null,
    plantName: qbOrder.plant_name ?? '—',
    plantId: null, // resolved from DB only after the order is persisted
    partNumber: firstItem?.partNumber ?? '—',
    partName: firstItem?.partName ?? '—',
    serviceType: qbOrder.service_type_name ?? qbOrder.service_type_detail ?? '—',
    orderStatus: qbOrder.state ?? 'open',
    regionName: qbOrder.region_name ?? null,
    serviceTypeDetail: qbOrder.service_type_detail ?? null,
    piecesPerHour: qbOrder.pieces_per_hour !== '' && qbOrder.pieces_per_hour !== null ? Number(qbOrder.pieces_per_hour) : null,
    authorizedHours: qbOrder.authorized_hours !== '' && qbOrder.authorized_hours !== null ? Number(qbOrder.authorized_hours) : null,
    pricePerHour: qbOrder.price_per_hour !== '' && qbOrder.price_per_hour !== null ? Number(qbOrder.price_per_hour) : null,
    language: qbOrder.language ?? null,
    userName: qbOrder.user_name ?? null,
    clientContactName: qbOrder.client_contact_name ?? null,
    clientContactEmail: qbOrder.client_contact_email ?? null,
    quotations,
    items,
    hoe: null,
    arranqueSeguro: null,
  }
}

export async function importCotizacionAction(
  _state: ImportCotizacionState,
  formData: FormData,
): Promise<ImportCotizacionState> {
  const session = await getSession()
  if (!session || !can(session, 'cotizaciones.importar')) {
    return { ok: false, error: 'No autorizado.' }
  }

  const raw = { orden: formData.get('orden') as string }
  const validated = Schema.safeParse(raw)
  if (!validated.success) {
    return { ok: false, error: validated.error.flatten().fieldErrors.orden?.[0] ?? 'Datos inválidos.' }
  }

  // --- Step 1: query QB API for the order header — no DB writes ---
  const orderResult = await searchOrder(validated.data.orden)
  if (!orderResult.ok) {
    return { ok: false, error: ERROR_MESSAGES[orderResult.error] ?? 'Error al consultar la orden en QB.' }
  }
  if (!orderResult.found) {
    return { ok: false, error: ERROR_MESSAGES['not_found'] }
  }

  // --- Step 1a-bis: bloquear órdenes cerradas/canceladas — no admiten nuevas asignaciones.
  // (Evita además que el fallback del merge muestre sus ítems como asignables.)
  const rawState = (orderResult.data.state ?? '').trim().toLowerCase()
  if (['closed', 'cerrada', 'cancelled', 'cancelada'].includes(rawState)) {
    return {
      ok: false,
      error: 'Esta orden está cerrada y no admite nuevas asignaciones.',
    }
  }

  // --- Step 1b: check if order already exists in DB (vía qb_sync API) ---
  const orderId = Number(orderResult.data.id)
  const existsInDb = await orderExists(orderId, session.accessToken)

  // --- Step 1c: filtro estricto por planta — admin ve todo, el resto solo su planta ---
  if (session.rol !== 'admin') {
    const userPlant = (session.plantaNombre ?? '').trim().toLowerCase()
    const orderPlant = (orderResult.data.plant_name ?? '').trim().toLowerCase()
    if (!userPlant || userPlant !== orderPlant) {
      return {
        ok: false,
        error: 'Esta orden pertenece a otra planta. Solo puedes gestionar órdenes de tu planta asignada.',
      }
    }
  }

  // --- Step 2: query QB API for the associated cotizaciones --- no DB writes ---
  const cotizacionesResult = await searchCotizaciones(validated.data.orden)
  if (!cotizacionesResult.ok) {
    return { ok: false, error: ERROR_MESSAGES[cotizacionesResult.error] ?? 'Error al consultar cotizaciones en QB.' }
  }

  // --- Step 3: map raw QB data to OrderWorkload shape, ready for the modal ---
  const qbOrder = buildOrderWorkloadFromQB(orderResult.data, cotizacionesResult.data)

  // --- Step 4: merge with persisted items if the order already exists in DB ---
  // Re-buscar una orden ya importada debe mostrar TODOS sus items: los ya asignados
  // con su id real + estado, y los que faltan por trabajar como id=0 (asignables).
  if (!existsInDb) {
    return { ok: true, order: qbOrder }
  }

  const persisted = await getOrderWorkloadById(orderId, session.accessToken)
  if (!persisted) {
    // El flag de existencia era true pero el workload no devolvió la orden → usar QB.
    return { ok: true, order: qbOrder }
  }

  // Clave de cruce: cotización|part_number (así identifica qb_sync un order_item).
  // OJO: SysQB NO expone id único por item, así que puede haber VARIOS items con la
  // misma clave (misma parte/lote). Por eso consumimos los persistidos 1:1 (no por
  // lookup compartido) — si no, varios items de QB tomarían el MISMO objeto persistido
  // y se duplicarían las keys de React (items que parpadean/desaparecen).
  const itemKey = (item: OrderItemWorkload): string =>
    `${item.quotationConsecutive ?? ''}|${item.partNumber ?? ''}`

  // Dedup defensivo: si el workload devolviera el mismo item (mismo id) más de una vez
  // (p.ej. qb_sync sin reiniciar con el dedup), no lo propagamos → evita keys duplicadas.
  const seenIds = new Set<number>()
  const uniquePersisted = persisted.items.filter((item) => {
    if (seenIds.has(item.id)) return false
    seenIds.add(item.id)
    return true
  })

  // Cola de items persistidos por clave (para consumir cada uno una sola vez).
  const persistedQueues = new Map<string, OrderItemWorkload[]>()
  for (const item of uniquePersisted) {
    const k = itemKey(item)
    const q = persistedQueues.get(k)
    if (q) q.push(item)
    else persistedQueues.set(k, [item])
  }

  // Por cada item de QB: consume UNA coincidencia persistida (id real + estado);
  // si no queda ninguna para esa clave, se deja el de QB (id=0, asignable).
  const mergedFromQB = qbOrder.items.map((qbItem) => {
    const q = persistedQueues.get(itemKey(qbItem))
    if (q && q.length > 0) return q.shift() as OrderItemWorkload
    return qbItem
  })

  // Persistidos que no cruzaron con ningún item de QB → se agregan (no perder trabajo).
  const leftoverPersisted = [...persistedQueues.values()].flat()

  const order: OrderWorkload = {
    ...qbOrder,
    id: persisted.id,
    plantId: persisted.plantId ?? qbOrder.plantId,
    items: [...mergedFromQB, ...leftoverPersisted],
  }

  return { ok: true, order }
}
