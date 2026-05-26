'use server'

import { getSession } from '@/back/services/session'
import { prisma } from '@/back/db/prisma'

export type AssignOrderItemState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined

export async function assignOrderItemAction(
  _state: AssignOrderItemState,
  formData: FormData,
): Promise<AssignOrderItemState> {
  // 1. Validate form inputs
  const orderItemId = Number(formData.get('orderItemId'))
  const tabletDbId = Number(formData.get('tabletId'))

  if (!orderItemId || !tabletDbId) {
    return { ok: false, error: 'Datos de asignación incompletos.' }
  }

  // 2. Validate session
  const session = await getSession()
  if (!session) return { ok: false, error: 'Sesión expirada. Por favor inicia sesión nuevamente.' }

  // 3. Query OrderItem with full include chain
  const orderItem = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    select: {
      partNumber: true,
      partName: true,
      inventory: true,
      inventoryDone: true,
      plant: { select: { name: true } },
      quotation: {
        select: {
          id: true,
          consecutiveNumber: true,
          clientName: true,
          status: true,
          plant: { select: { name: true } },
          order: {
            select: {
              id: true,
              consecutiveNumber: true,
              state: true,
              clientName: true,
              clientContactName: true,
              clientContactEmail: true,
              serviceTypeName: true,
              piecesPerHour: true,
              authorizedHours: true,
              pricePerHour: true,
              language: true,
              userName: true,
              plant: { select: { name: true } },
            },
          },
        },
      },
    },
  })

  if (!orderItem) return { ok: false, error: 'Item de orden no encontrado.' }

  // 4. Query Tablet by local DB id
  const tablet = await prisma.tablet.findUnique({
    where: { id: tabletDbId },
    select: { codigoTablet: true },
  })
  if (!tablet) return { ok: false, error: 'Tablet no encontrada.' }

  // 5. Guard: fast local check before hitting the API
  const activeSession = await prisma.inspectionSession.findFirst({
    where: { orderItemId, status: { not: 'finalizado' } },
    select: { id: true },
  })
  if (activeSession) {
    return { ok: false, error: 'Este item ya tiene una tablet asignada.' }
  }

  // 6. Build request body and POST to companion API
  const { quotation } = orderItem
  const { order } = quotation

  const requestBody = {
    order: {
      id: order.id,
      consecutive_number: order.consecutiveNumber ?? '',
      state: order.state ?? '',
      client_name: order.clientName ?? '',
      client_contact_name: order.clientContactName ?? '',
      client_contact_email: order.clientContactEmail ?? '',
      service_type_name: order.serviceTypeName ?? '',
      pieces_per_hour: Number(order.piecesPerHour ?? 0),
      authorized_hours: Number(order.authorizedHours ?? 0),
      price_per_hour: Number(order.pricePerHour ?? 0),
      language: order.language ?? '',
      user_name: order.userName ?? '',
      region_name: '',
      plant_name: order.plant?.name ?? '',
    },
    quotation: {
      id: quotation.id,
      consecutive_number: quotation.consecutiveNumber ?? '',
      client_name: quotation.clientName ?? '',
      status: quotation.status ?? '',
      region_name: '',
      plant_name: quotation.plant?.name ?? '',
    },
    orderItem: {
      part_number: orderItem.partNumber ?? '',
      part_name: orderItem.partName ?? '',
      inventory: Number(orderItem.inventory ?? 0),
      inventory_done: Number(orderItem.inventoryDone ?? 0),
      plant_name: orderItem.plant?.name ?? '',
    },
    inspectionSession: {
      id_supervisor: session.codigoEmpleado,
      id_tablet: tablet.codigoTablet,
      status: 'asignado',
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

  // 7. Handle API error responses
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.success === false) {
    return { ok: false, error: body.message ?? 'Error al asignar la tablet.' }
  }

  // 8. Success
  return { ok: true }
}
