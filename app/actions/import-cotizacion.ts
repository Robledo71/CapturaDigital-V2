'use server'

import { z } from 'zod'
import { searchOrder, searchCotizaciones, type QBOrderData, type QBCotizacion, type QBOrderItem } from '@/back/services/qb-api'
import { type OrderWorkload, type OrderItemWorkload, type QuotationSummary } from '@/back/services/cargaDeTrabajoService'
import { prisma } from '@/back/db/prisma'

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
  cotizaciones: QBCotizacion[],
): OrderWorkload {
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

  // --- Step 1b: block re-import if order already exists in DB ---
  const orderId = Number(orderResult.data.id)
  const existsInDb = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  })
  if (existsInDb) {
    return {
      ok: false,
      error: 'Esta orden ya fue importada. Búscala directamente en la tabla de carga de trabajo.',
    }
  }

  // --- Step 2: query QB API for the associated cotizaciones --- no DB writes ---
  const cotizacionesResult = await searchCotizaciones(validated.data.orden)
  if (!cotizacionesResult.ok) {
    return { ok: false, error: ERROR_MESSAGES[cotizacionesResult.error] ?? 'Error al consultar cotizaciones en QB.' }
  }

  // --- Step 3: map raw QB data to OrderWorkload shape, ready for the modal ---
  const order = buildOrderWorkloadFromQB(orderResult.data, cotizacionesResult.data)

  return { ok: true, order }
}
