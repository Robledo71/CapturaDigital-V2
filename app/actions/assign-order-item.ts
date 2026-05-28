'use server'

import { getSession } from '@/back/services/session'
import { prisma } from '@/back/db/prisma'

export type AssignOrderItemState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined

/**
 * Raw QB order data passed as hidden fields from the UI when the item
 * does not yet exist in the Prisma DB (i.e. it came from importCotizacionAction).
 */
interface QBRawFields {
  // Order
  qb_order_id: string
  qb_order_consecutive: string
  qb_order_state: string
  qb_order_client_name: string
  qb_order_client_contact_name: string
  qb_order_client_contact_email: string
  qb_order_service_type_name: string
  qb_order_service_type_detail: string
  qb_order_pieces_per_hour: string
  qb_order_authorized_hours: string
  qb_order_price_per_hour: string
  qb_order_language: string
  qb_order_user_name: string
  qb_order_plant_name: string
  qb_order_region_name: string
  // Quotation
  qb_quotation_id: string
  qb_quotation_consecutive: string
  qb_quotation_client_email: string
  qb_quotation_status: string
  qb_quotation_purchase_order_number: string
  qb_quotation_contact_emails: string
  qb_quotation_order_user_name: string
  // OrderItem
  qb_item_part_number: string
  qb_item_part_name: string
  qb_item_inventory: string
  qb_item_inventory_done: string
  qb_item_plant_name: string
}

function getStr(formData: FormData, key: string): string {
  return (formData.get(key) as string | null) ?? ''
}

/**
 * Translate QB API / legacy Rails order state values to the current English
 * enum expected by Prisma.  QB returns Spanish values ('abierta', 'cerrada')
 * because it reads directly from the legacy qualitybolca DB.
 */
function mapOrderState(state: string | null | undefined): string | null {
  if (!state) return null
  if (state === 'cerrada') return 'closed'
  if (state === 'closed')  return 'closed'
  if (state === 'cancelled') return 'cancelled'
  // 'abierta', 'open', or any unknown value → open
  return 'open'
}

/**
 * Upsert Order → Quotation → OrderItem in Prisma and return the OrderItem id.
 * This mirrors the logic previously in importCotizacionesByOrden, but runs
 * only at assignment time, not at search time.
 */
async function upsertOrderItemInPrisma(raw: QBRawFields): Promise<number> {
  const orderId = Number(raw.qb_order_id)
  const quotationId = Number(raw.qb_quotation_id)

  // 1. Resolve plant ids (best-effort — null if plant not found)
  const [orderPlant, itemPlant] = await Promise.all([
    raw.qb_order_plant_name
      ? prisma.plant.findFirst({ where: { name: raw.qb_order_plant_name }, select: { id: true, regionId: true } })
      : null,
    raw.qb_item_plant_name
      ? prisma.plant.findFirst({ where: { name: raw.qb_item_plant_name }, select: { id: true } })
      : null,
  ])

  // 1b. Resolve regionId — prefer the plant's regionId, fall back to a direct region name lookup
  const regionId: number | null = orderPlant?.regionId
    ?? (raw.qb_order_region_name
      ? (await prisma.region.findFirst({ where: { name: raw.qb_order_region_name }, select: { id: true } }))?.id ?? null
      : null)

  // 2. Upsert Order
  await prisma.order.upsert({
    where: { id: orderId },
    create: {
      id: orderId,
      state: mapOrderState(raw.qb_order_state),
      consecutiveNumber: raw.qb_order_consecutive || null,
      serviceTypeName: raw.qb_order_service_type_name || null,
      serviceTypeDetail: raw.qb_order_service_type_detail || null,
      piecesPerHour: raw.qb_order_pieces_per_hour !== '' ? raw.qb_order_pieces_per_hour : null,
      authorizedHours: raw.qb_order_authorized_hours !== '' ? raw.qb_order_authorized_hours : null,
      pricePerHour: raw.qb_order_price_per_hour !== '' ? raw.qb_order_price_per_hour : null,
      language: raw.qb_order_language || null,
      userName: raw.qb_order_user_name || null,
      clientContactName: raw.qb_order_client_contact_name || null,
      clientContactEmail: raw.qb_order_client_contact_email || null,
      plantId: orderPlant?.id ?? null,
      regionId: regionId,
    },
    update: {
      state: mapOrderState(raw.qb_order_state),
      consecutiveNumber: raw.qb_order_consecutive || null,
      serviceTypeName: raw.qb_order_service_type_name || null,
      serviceTypeDetail: raw.qb_order_service_type_detail || null,
      piecesPerHour: raw.qb_order_pieces_per_hour !== '' ? raw.qb_order_pieces_per_hour : null,
      authorizedHours: raw.qb_order_authorized_hours !== '' ? raw.qb_order_authorized_hours : null,
      pricePerHour: raw.qb_order_price_per_hour !== '' ? raw.qb_order_price_per_hour : null,
      language: raw.qb_order_language || null,
      userName: raw.qb_order_user_name || null,
      clientContactName: raw.qb_order_client_contact_name || null,
      clientContactEmail: raw.qb_order_client_contact_email || null,
      plantId: orderPlant?.id ?? null,
      regionId: regionId,
    },
  })

  // 2b. Bug #1 fix — find-or-create the client by name and link it to the order.
  //     The order upsert above never set clientId, so order.client was always null.
  const clientName = raw.qb_order_client_name?.trim()
  if (clientName) {
    const now = new Date()
    const client = await prisma.client.upsert({
      where: { name: clientName },
      create: { name: clientName, createdAt: now, updatedAt: now },
      update: {},
    })
    await prisma.order.update({
      where: { id: orderId },
      data: { clientId: client.id },
    })
  }

  // 3. Upsert Quotation
  // clientEmail now lives on quotations. region_id and plant_id have been removed.
  await prisma.quotation.upsert({
    where: { id: quotationId },
    create: {
      id: quotationId,
      orderId,
      consecutiveNumber: raw.qb_quotation_consecutive || null,
      clientEmail: raw.qb_quotation_client_email || null,
      status: raw.qb_quotation_status || null,
      purchaseOrderNumber: raw.qb_quotation_purchase_order_number || null,
      contactEmails: raw.qb_quotation_contact_emails || null,
      orderUserName: raw.qb_quotation_order_user_name || null,
    },
    update: {
      consecutiveNumber: raw.qb_quotation_consecutive || null,
      clientEmail: raw.qb_quotation_client_email || null,
      status: raw.qb_quotation_status || null,
      purchaseOrderNumber: raw.qb_quotation_purchase_order_number || null,
      contactEmails: raw.qb_quotation_contact_emails || null,
      orderUserName: raw.qb_quotation_order_user_name || null,
    },
  })

  // 4. Upsert OrderItem (find-or-create by quotationId + partNumber)
  const itemPlantId = itemPlant?.id ?? null
  const partNumber = raw.qb_item_part_number || null

  const existing = await prisma.orderItem.findFirst({
    where: { quotationId, partNumber },
    select: { id: true },
  })

  if (existing) {
    await prisma.orderItem.update({
      where: { id: existing.id },
      data: {
        partName: raw.qb_item_part_name || null,
        inventory: raw.qb_item_inventory !== '' ? raw.qb_item_inventory : null,
        inventoryDone: raw.qb_item_inventory_done !== '' ? raw.qb_item_inventory_done : null,
        plantId: itemPlantId,
      },
    })
    return existing.id
  }

  const created = await prisma.orderItem.create({
    data: {
      quotationId,
      partNumber,
      partName: raw.qb_item_part_name || null,
      inventory: raw.qb_item_inventory !== '' ? raw.qb_item_inventory : null,
      inventoryDone: raw.qb_item_inventory_done !== '' ? raw.qb_item_inventory_done : null,
      plantId: itemPlantId,
    },
  })
  return created.id
}

export async function assignOrderItemAction(
  _state: AssignOrderItemState,
  formData: FormData,
): Promise<AssignOrderItemState> {
  // 1. Validate session early
  const session = await getSession()
  if (!session) return { ok: false, error: 'Sesión expirada. Por favor inicia sesión nuevamente.' }

  // 2. Read tablet selection
  const tabletDbId = Number(formData.get('tabletId'))
  if (!tabletDbId) return { ok: false, error: 'Selecciona una tablet.' }

  const tablet = await prisma.tablet.findUnique({
    where: { id: tabletDbId },
    select: { codigoTablet: true },
  })
  if (!tablet) return { ok: false, error: 'Tablet no encontrada.' }

  // 3. Determine if the order item already exists in Prisma or must be created first.
  //    The UI passes orderItemId = 0 (sentinel) when the item came from a QB search
  //    and has not yet been persisted. In that case, raw QB fields are also present.
  const rawOrderItemId = Number(formData.get('orderItemId') ?? '0')
  const isNewItem = rawOrderItemId === 0

  let orderItemId: number

  if (isNewItem) {
    // Collect raw QB fields sent as hidden inputs by the AssignItemModal
    const raw: QBRawFields = {
      qb_order_id: getStr(formData, 'qb_order_id'),
      qb_order_consecutive: getStr(formData, 'qb_order_consecutive'),
      qb_order_state: getStr(formData, 'qb_order_state'),
      qb_order_client_name: getStr(formData, 'qb_order_client_name'),
      qb_order_client_contact_name: getStr(formData, 'qb_order_client_contact_name'),
      qb_order_client_contact_email: getStr(formData, 'qb_order_client_contact_email'),
      qb_order_service_type_name: getStr(formData, 'qb_order_service_type_name'),
      qb_order_service_type_detail: getStr(formData, 'qb_order_service_type_detail'),
      qb_order_pieces_per_hour: getStr(formData, 'qb_order_pieces_per_hour'),
      qb_order_authorized_hours: getStr(formData, 'qb_order_authorized_hours'),
      qb_order_price_per_hour: getStr(formData, 'qb_order_price_per_hour'),
      qb_order_language: getStr(formData, 'qb_order_language'),
      qb_order_user_name: getStr(formData, 'qb_order_user_name'),
      qb_order_plant_name: getStr(formData, 'qb_order_plant_name'),
      qb_order_region_name: getStr(formData, 'qb_order_region_name'),
      qb_quotation_id: getStr(formData, 'qb_quotation_id'),
      qb_quotation_consecutive: getStr(formData, 'qb_quotation_consecutive'),
      qb_quotation_client_email: getStr(formData, 'qb_quotation_client_email'),
      qb_quotation_status: getStr(formData, 'qb_quotation_status'),
      qb_quotation_purchase_order_number: getStr(formData, 'qb_quotation_purchase_order_number'),
      qb_quotation_contact_emails: getStr(formData, 'qb_quotation_contact_emails'),
      qb_quotation_order_user_name: getStr(formData, 'qb_quotation_order_user_name'),
      qb_item_part_number: getStr(formData, 'qb_item_part_number'),
      qb_item_part_name: getStr(formData, 'qb_item_part_name'),
      qb_item_inventory: getStr(formData, 'qb_item_inventory'),
      qb_item_inventory_done: getStr(formData, 'qb_item_inventory_done'),
      qb_item_plant_name: getStr(formData, 'qb_item_plant_name'),
    }

    if (!raw.qb_order_id || !raw.qb_quotation_id) {
      return { ok: false, error: 'Datos de la orden incompletos. Busca la cotización nuevamente.' }
    }

    // Persist Order → Quotation → OrderItem in Prisma before calling qb_sync
    orderItemId = await upsertOrderItemInPrisma(raw)
  } else {
    orderItemId = rawOrderItemId
  }

  // 4. Guard: prevent double-assignment using the now-resolved Prisma id
  const activeSession = await prisma.inspectionSession.findFirst({
    where: { orderItemId, status: { not: 'finished' } },
    select: { id: true },
  })
  if (activeSession) {
    return { ok: false, error: 'Este item ya tiene una tablet asignada.' }
  }

  // 5. Guard: block if there is already a submitted (or further) daily report
  const submittedReport = await prisma.dailyReport.findFirst({
    where: {
      orderItemId,
      status: { in: ['submitted', 'sampled', 'signed', 'published'] },
    },
    select: { id: true },
  })
  if (submittedReport) {
    return {
      ok: false,
      error: 'No se puede asignar. Este item ya tiene un reporte enviado.',
    }
  }

  // 6. Re-read the full OrderItem from Prisma to build the qb_sync request body
  const orderItem = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    select: {
      partNumber: true,
      partName: true,
      inventory: true,
      inventoryDone: true,
      incidents: true,                          // Bug #5 fix — was missing
      plant: { select: { name: true } },
      quotation: {
        select: {
          consecutiveNumber: true,
          clientEmail: true,
          status: true,
          purchaseOrderNumber: true,            // Bug #4 fix — was missing
          contactEmails: true,                  // Bug #4 fix — was missing
          orderUserName: true,                  // Bug #4 fix — was missing
          order: {
            select: {
              consecutiveNumber: true,
              state: true,
              client: { select: { name: true } }, // Bug #1 fix — was missing
              clientContactName: true,
              clientContactEmail: true,
              serviceTypeName: true,
              piecesPerHour: true,
              authorizedHours: true,
              pricePerHour: true,
              language: true,
              userName: true,
              plant: {
                select: {
                  name: true,
                  region: { select: { name: true } }, // Bug #3 fix — was missing
                },
              },
            },
          },
        },
      },
    },
  })

  if (!orderItem) return { ok: false, error: 'Item de orden no encontrado tras el guardado.' }

  // 7. Build request body and POST to companion API
  const { quotation } = orderItem
  const { order } = quotation

  const requestBody = {
    order: {
      consecutive_number: order.consecutiveNumber ?? '',
      state: order.state ?? '',
      client_name: order.client?.name ?? '',          // Bug #1 fix — now populated via clientId FK
      client_contact_name: order.clientContactName ?? '',
      client_contact_email: order.clientContactEmail ?? '',
      service_type_name: order.serviceTypeName ?? '',
      pieces_per_hour: Number(order.piecesPerHour ?? 0),
      authorized_hours: Number(order.authorizedHours ?? 0),
      price_per_hour: Number(order.pricePerHour ?? 0),
      language: order.language ?? '',
      user_name: order.userName ?? '',
      region_name: order.plant?.region?.name ?? '',   // Bug #3 fix — was hardcoded ''
      plant_name: order.plant?.name ?? '',
    },
    quotation: {
      consecutive_number: quotation.consecutiveNumber ?? '',
      client_email: quotation.clientEmail ?? '',
      status: quotation.status ?? '',
      purchase_order_number: quotation.purchaseOrderNumber ?? '',  // Bug #4 fix — was missing
      contact_emails: quotation.contactEmails ?? '',               // Bug #4 fix — was missing
      order_user_name: quotation.orderUserName ?? '',              // Bug #4 fix — was missing
    },
    orderItem: {
      part_number: orderItem.partNumber ?? '',
      part_name: orderItem.partName ?? '',
      inventory: Number(orderItem.inventory ?? 0),
      inventory_done: Number(orderItem.inventoryDone ?? 0),
      plant_name: orderItem.plant?.name ?? '',
      incidents: orderItem.incidents ?? '',                        // Bug #5 fix — was missing
    },
    inspectionSession: {
      id_supervisor: session.codigoEmpleado,
      id_tablet: tablet.codigoTablet,
      status: 'assigned',
      fecha_inicio: new Date().toISOString(),
    },
  }

  let res: Response
  try {
    res = await fetch(`${process.env.QSYNC_API_URL}/qb_sync/order-items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Token': process.env.X_APP_TOKEN ?? '',
        'Authorization': `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(requestBody),
    })
  } catch {
    return { ok: false, error: 'No se pudo conectar con el servidor. Intenta nuevamente.' }
  }

  // 8. Handle API error responses
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.success === false) {
    return { ok: false, error: body.message ?? 'Error al asignar la tablet.' }
  }

  // 9. Success
  return { ok: true }
}
