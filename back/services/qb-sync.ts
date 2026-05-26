import 'server-only'
import { prisma } from '@/back/db/prisma'
import { searchOrder, searchCotizaciones, QBOrderItem } from './qb-api'

// QB API returns order_items in one of four shapes:
//   1. null / undefined / non-object  → no items
//   2. Proper JS array                → filter valid non-null objects
//   3. Single QBOrderItem object      → detected by the presence of 'part_number' or
//      'inventory' as own keys; treated as one item UNLESS both are null (placeholder)
//   4. Numeric-keyed object-of-objects {"0":{...},"1":{...}} → extract and filter
function toItemArray(value: unknown): QBOrderItem[] {
  // Shape 1: null / undefined / primitive
  if (value === null || value === undefined || typeof value !== 'object') return []

  // Shape 2: proper array
  if (Array.isArray(value)) {
    return (value as unknown[]).filter(
      (v): v is QBOrderItem => v !== null && typeof v === 'object'
    )
  }

  const obj = value as Record<string, unknown>

  // Shape 3: single QBOrderItem object — QB API returns one flat object with field names
  // as keys (e.g. "part_number", "inventory") rather than numeric indices.
  if ('part_number' in obj || 'inventory' in obj) {
    // All-null placeholder (e.g. cotización with no items) — return nothing
    if (obj.part_number === null && obj.inventory === null) return []
    return [obj as unknown as QBOrderItem]
  }

  // Shape 4: numeric-keyed object-of-objects {"0":{...},"1":{...}}
  return (Object.values(obj) as unknown[]).filter(
    (v): v is QBOrderItem => v !== null && typeof v === 'object'
  )
}

export type ImportCotizacionResult =
  | { ok: true; cotizacionesImported: number; itemsImported: number; orderId: number }
  | { ok: false; error: 'not_found' | 'auth' | 'rate_limit' | 'validation' | 'server' | 'network'; message: string }

export async function importCotizacionesByOrden(orden: string): Promise<ImportCotizacionResult> {
  const orderResult = await searchOrder(orden)
  if (!orderResult.ok) return orderResult
  if (!orderResult.found) {
    return { ok: false, error: 'not_found', message: `No se encontró la orden "${orden}" en QB.` }
  }
  const qbOrder = orderResult.data

  const cotizacionesResult = await searchCotizaciones(orden)
  if (!cotizacionesResult.ok) return cotizacionesResult
  const cotizaciones = cotizacionesResult.data

  const orderPlant = qbOrder.plant_name
    ? await prisma.plant.findFirst({ where: { name: qbOrder.plant_name }, select: { id: true } })
    : null

  await prisma.order.upsert({
    where: { id: Number(qbOrder.id) },
    create: {
      id: Number(qbOrder.id),
      state: qbOrder.state,
      consecutiveNumber: qbOrder.consecutive_number,
      serviceTypeDetail: qbOrder.service_type_detail,
      serviceTypeName: qbOrder.service_type_name,
      piecesPerHour: qbOrder.pieces_per_hour !== '' ? qbOrder.pieces_per_hour : null,
      authorizedHours: qbOrder.authorized_hours !== '' ? qbOrder.authorized_hours : null,
      pricePerHour: qbOrder.price_per_hour !== '' ? qbOrder.price_per_hour : null,
      language: qbOrder.language,
      userName: qbOrder.user_name,
      clientName: qbOrder.client_name,
      clientContactName: qbOrder.client_contact_name,
      clientContactEmail: qbOrder.client_contact_email,
      plantId: orderPlant?.id ?? null,
      createdAt: qbOrder.created_at ? new Date(qbOrder.created_at) : null,
      updatedAt: qbOrder.updated_at ? new Date(qbOrder.updated_at) : null,
    },
    update: {
      state: qbOrder.state,
      consecutiveNumber: qbOrder.consecutive_number,
      serviceTypeDetail: qbOrder.service_type_detail,
      serviceTypeName: qbOrder.service_type_name,
      piecesPerHour: qbOrder.pieces_per_hour !== '' ? qbOrder.pieces_per_hour : null,
      authorizedHours: qbOrder.authorized_hours !== '' ? qbOrder.authorized_hours : null,
      pricePerHour: qbOrder.price_per_hour !== '' ? qbOrder.price_per_hour : null,
      language: qbOrder.language,
      userName: qbOrder.user_name,
      clientName: qbOrder.client_name,
      clientContactName: qbOrder.client_contact_name,
      clientContactEmail: qbOrder.client_contact_email,
      plantId: orderPlant?.id ?? null,
    },
  })

  let totalItems = 0

  for (const cotizacion of cotizaciones) {
    const cotPlant = cotizacion.plant_name
      ? await prisma.plant.findFirst({ where: { name: cotizacion.plant_name }, select: { id: true } })
      : null

    await prisma.quotation.upsert({
      where: { id: Number(cotizacion.id) },
      create: {
        id: Number(cotizacion.id),
        orderId: Number(cotizacion.order_id),
        consecutiveNumber: cotizacion.consecutive_number,
        clientName: cotizacion.client_name,
        clientEmail: cotizacion.client_email,
        status: cotizacion.status,
        purchaseOrderNumber: cotizacion.purchase_order_number,
        contactEmails: cotizacion.contact_emails,
        orderUserName: cotizacion.order_user_name,
        orderConsecutiveNumber: cotizacion.order_consecutive_number,
        plantId: cotPlant?.id ?? null,
        createdAt: cotizacion.created_at ? new Date(cotizacion.created_at) : null,
        updatedAt: cotizacion.updated_at ? new Date(cotizacion.updated_at) : null,
      },
      update: {
        consecutiveNumber: cotizacion.consecutive_number,
        clientName: cotizacion.client_name,
        clientEmail: cotizacion.client_email,
        status: cotizacion.status,
        purchaseOrderNumber: cotizacion.purchase_order_number,
        contactEmails: cotizacion.contact_emails,
        orderUserName: cotizacion.order_user_name,
        orderConsecutiveNumber: cotizacion.order_consecutive_number,
        plantId: cotPlant?.id ?? null,
      },
    })

    for (const item of toItemArray(cotizacion.order_items)) {
      const itemPlantId = item.plant_name
        ? (await prisma.plant.findFirst({ where: { name: item.plant_name }, select: { id: true } }))?.id ?? cotPlant?.id ?? null
        : cotPlant?.id ?? null

      const existing = await prisma.orderItem.findFirst({
        where: { quotationId: Number(cotizacion.id), partNumber: item.part_number },
        select: { id: true },
      })

      const itemData = {
        partName: item.part_name,
        inventory: item.inventory !== '' ? item.inventory : null,
        inventoryDone: item.inventory_done !== '' ? item.inventory_done : null,
        incidents: item.incidents,
        plantId: itemPlantId,
      }

      if (existing) {
        await prisma.orderItem.update({ where: { id: existing.id }, data: itemData })
      } else {
        await prisma.orderItem.create({
          data: { quotationId: Number(cotizacion.id), partNumber: item.part_number, ...itemData },
        })
      }
      totalItems++
    }
  }

  return {
    ok: true,
    cotizacionesImported: cotizaciones.length,
    itemsImported: totalItems,
    orderId: Number(qbOrder.id),
  }
}
