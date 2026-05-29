import 'server-only'
import { prisma } from '@/back/db/prisma'

export type AssignedTablet = {
  id: number
  alias: string
}

export type QuotationSummary = {
  id: number
  consecutiveNumber: string | null
  status: string | null
  total: number
  clientEmail: string | null
  purchaseOrderNumber: string | null
  contactEmails: string | null
  orderUserName: string | null
  orderConsecutiveNumber: string | null
}

export type OrderItemWorkload = {
  id: number
  partNumber: string
  partName: string
  status: string
  inventario: number
  inventarioTerminado: number
  assignedAt: Date | null
  assignedTablet: AssignedTablet | null
  quotationConsecutive: string | null
  hasSubmittedReport: boolean
}

export type OrderWorkload = {
  id: number
  consecutiveNumber: string | null
  clientName: string | null
  plantName: string
  plantId: number | null
  partNumber: string
  partName: string
  serviceType: string
  orderStatus: string
  regionName: string | null
  serviceTypeDetail: string | null
  piecesPerHour: number | null
  authorizedHours: number | null
  pricePerHour: number | null
  language: string | null
  userName: string | null
  clientContactName: string | null
  clientContactEmail: string | null
  quotations: QuotationSummary[]
  items: OrderItemWorkload[]
  hoe: string | null
  arranqueSeguro: string | null
}

export type TabletOption = {
  id: number
  alias: string
  serialNumber: string
  codigoTablet: string
  plantId: number | null
  plantName: string | null
  status: string
}

function deriveItemStatus(sessionStatus: string | null): string {
  if (!sessionStatus) return 'pending'
  // English values (current DB schema)
  if (sessionStatus === 'assigned')    return 'assigned'
  if (sessionStatus === 'in_progress') return 'in_progress'
  if (sessionStatus === 'finished')    return 'completed'
  // Legacy Spanish values (pre-migration rows — kept for backward compat)
  if (sessionStatus === 'asignado')   return 'assigned'
  if (sessionStatus === 'en_proceso') return 'in_progress'
  if (sessionStatus === 'finalizado') return 'completed'
  return 'pending'
}

export async function getCargaDeTrabajoData(_supervisorCodigoEmpleado: string): Promise<OrderWorkload[]> {
  const orders = await prisma.order.findMany({
    where: { NOT: { state: 'closed' } },
    include: {
      plant: { select: { id: true, name: true, region: { select: { name: true } } } },
      client: { select: { name: true } },
      quotations: {
        include: {
          items: {
            include: {
              sessions: {
                orderBy: { id: 'desc' },
                take: 1,
              },
            },
          },
        },
      },
    },
    orderBy: { id: 'desc' },
  })

  // Batch-fetch tablets referenced in active (non-finished) sessions only
  const codigosTablet = new Set<string>()
  for (const order of orders) {
    for (const quotation of order.quotations) {
      for (const item of quotation.items) {
        const session = item.sessions[0]
        if (session?.tabletId && session.status !== 'finished') codigosTablet.add(session.tabletId)
      }
    }
  }

  const tablets = codigosTablet.size > 0
    ? await prisma.tablet.findMany({
        where: { codigoTablet: { in: Array.from(codigosTablet) } },
        select: { id: true, alias: true, codigoTablet: true },
      })
    : []

  const tabletByCode = new Map(tablets.map((t) => [t.codigoTablet, t]))

  // Batch-query submitted daily reports for all items across all orders
  const allItemIds = orders.flatMap((order) =>
    order.quotations.flatMap((q) => q.items.map((i) => i.id))
  ).filter((id) => id > 0)

  const submittedReportItems = allItemIds.length > 0
    ? await prisma.dailyReport.findMany({
        where: {
          orderItemId: { in: allItemIds },
          status: { in: ['submitted', 'sampled', 'signed', 'published'] },
        },
        select: { orderItemId: true },
      })
    : []
  const submittedSet = new Set(submittedReportItems.map((r) => r.orderItemId))

  return orders.map((order) => {
    const allItems: OrderItemWorkload[] = order.quotations.flatMap((quotation) =>
      quotation.items.map((item) => {
        const latestSession = item.sessions[0] ?? null
        const isActive = latestSession !== null && latestSession.status !== 'finished'
        const tabletRecord = isActive ? tabletByCode.get(latestSession.tabletId) : null

        return {
          id: item.id,
          partNumber: item.partNumber ?? '—',
          partName: item.partName ?? '—',
          status: deriveItemStatus(latestSession?.status ?? null),
          inventario: item.inventory ? Number(item.inventory) : 0,
          inventarioTerminado: item.inventoryDone ? Number(item.inventoryDone) : 0,
          assignedAt: isActive ? latestSession?.fechaInicio ?? null : null,
          assignedTablet: tabletRecord
            ? { id: tabletRecord.id, alias: tabletRecord.alias ?? tabletRecord.codigoTablet }
            : null,
          quotationConsecutive: quotation.consecutiveNumber,
          hasSubmittedReport: submittedSet.has(item.id),
        }
      }),
    )

    const firstItem = allItems[0]

    return {
      id: order.id,
      consecutiveNumber: order.consecutiveNumber,
      clientName: order.client?.name ?? null,
      plantName: order.plant?.name ?? '—',
      plantId: order.plant?.id ?? null,
      partNumber: firstItem?.partNumber ?? '—',
      partName: firstItem?.partName ?? '—',
      serviceType: order.serviceTypeName ?? order.serviceTypeDetail ?? '—',
      orderStatus: order.state ?? 'open',
      regionName: order.plant?.region?.name ?? null,
      serviceTypeDetail: order.serviceTypeDetail ?? null,
      piecesPerHour: order.piecesPerHour ? Number(order.piecesPerHour) : null,
      authorizedHours: order.authorizedHours ? Number(order.authorizedHours) : null,
      pricePerHour: order.pricePerHour ? Number(order.pricePerHour) : null,
      language: order.language ?? null,
      userName: order.userName ?? null,
      clientContactName: order.clientContactName ?? null,
      clientContactEmail: order.clientContactEmail ?? null,
      quotations: order.quotations.map((q) => ({
        id: q.id,
        consecutiveNumber: q.consecutiveNumber,
        status: q.status,
        total: 0,
        clientEmail: q.clientEmail ?? null,
        purchaseOrderNumber: q.purchaseOrderNumber ?? null,
        contactEmails: q.contactEmails ?? null,
        orderUserName: q.orderUserName ?? null,
        orderConsecutiveNumber: q.orderConsecutiveNumber ?? null,
      })),
      items: allItems,
      hoe: order.hoe ?? null,
      arranqueSeguro: order.arranqueSeguro ?? null,
    }
  })
}

type ExternalTablet = {
  id?: number
  codigoTablet?: string
  codigo_tablet?: string
  alias?: string
  serialNumber?: string
  serial_number?: string
  status?: string
  plantId?: number
  plant_id?: number
  plantName?: string
  plant_name?: string
}

export async function getOrderWorkloadById(id: number): Promise<OrderWorkload | null> {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      plant: { select: { id: true, name: true, region: { select: { name: true } } } },
      client: { select: { name: true } },
      quotations: {
        include: {
          items: {
            include: {
              sessions: {
                orderBy: { id: 'desc' },
                take: 1,
              },
            },
          },
        },
      },
    },
  })

  if (!order) return null

  const codigosTablet = new Set<string>()
  for (const quotation of order.quotations) {
    for (const item of quotation.items) {
      const session = item.sessions[0]
      if (session?.tabletId && session.status !== 'finished') codigosTablet.add(session.tabletId)
    }
  }

  const tablets = codigosTablet.size > 0
    ? await prisma.tablet.findMany({
        where: { codigoTablet: { in: Array.from(codigosTablet) } },
        select: { id: true, alias: true, codigoTablet: true },
      })
    : []

  const tabletByCode = new Map(tablets.map((t) => [t.codigoTablet, t]))

  // Batch-query submitted daily reports for this order items
  const orderItemIds = order.quotations.flatMap((q) => q.items.map((i) => i.id)).filter((id) => id > 0)

  const submittedReportItems = orderItemIds.length > 0
    ? await prisma.dailyReport.findMany({
        where: {
          orderItemId: { in: orderItemIds },
          status: { in: ['submitted', 'sampled', 'signed', 'published'] },
        },
        select: { orderItemId: true },
      })
    : []
  const submittedSet = new Set(submittedReportItems.map((r) => r.orderItemId))

  const allItems: OrderItemWorkload[] = order.quotations.flatMap((quotation) =>
    quotation.items.map((item) => {
      const latestSession = item.sessions[0] ?? null
      const isActive = latestSession !== null && latestSession.status !== 'finished'
      const tabletRecord = isActive ? tabletByCode.get(latestSession.tabletId) : null

      return {
        id: item.id,
        partNumber: item.partNumber ?? '—',
        partName: item.partName ?? '—',
        status: deriveItemStatus(latestSession?.status ?? null),
        inventario: item.inventory ? Number(item.inventory) : 0,
        inventarioTerminado: item.inventoryDone ? Number(item.inventoryDone) : 0,
        assignedAt: isActive ? latestSession?.fechaInicio ?? null : null,
        assignedTablet: tabletRecord
          ? { id: tabletRecord.id, alias: tabletRecord.alias ?? tabletRecord.codigoTablet }
          : null,
        quotationConsecutive: quotation.consecutiveNumber,
        hasSubmittedReport: submittedSet.has(item.id),
      }
    }),
  )

  const firstItem = allItems[0]

  return {
    id: order.id,
    consecutiveNumber: order.consecutiveNumber,
    clientName: order.client?.name ?? null,
    plantName: order.plant?.name ?? '—',
    plantId: order.plant?.id ?? null,
    partNumber: firstItem?.partNumber ?? '—',
    partName: firstItem?.partName ?? '—',
    serviceType: order.serviceTypeName ?? order.serviceTypeDetail ?? '—',
    orderStatus: order.state ?? 'open',
    regionName: order.plant?.region?.name ?? null,
    serviceTypeDetail: order.serviceTypeDetail ?? null,
    piecesPerHour: order.piecesPerHour ? Number(order.piecesPerHour) : null,
    authorizedHours: order.authorizedHours ? Number(order.authorizedHours) : null,
    pricePerHour: order.pricePerHour ? Number(order.pricePerHour) : null,
    language: order.language ?? null,
    userName: order.userName ?? null,
    clientContactName: order.clientContactName ?? null,
    clientContactEmail: order.clientContactEmail ?? null,
    quotations: order.quotations.map((q) => ({
      id: q.id,
      consecutiveNumber: q.consecutiveNumber,
      status: q.status,
      total: 0,
      clientEmail: q.clientEmail ?? null,
      purchaseOrderNumber: q.purchaseOrderNumber ?? null,
      contactEmails: q.contactEmails ?? null,
      orderUserName: q.orderUserName ?? null,
      orderConsecutiveNumber: q.orderConsecutiveNumber ?? null,
    })),
    items: allItems,
    hoe: order.hoe ?? null,
    arranqueSeguro: order.arranqueSeguro ?? null,
  }
}

export async function getAvailableTablets(accessToken: string): Promise<TabletOption[]> {
  // 1. Fetch all tablets from the external companion API
  let externalTablets: ExternalTablet[] = []
  try {
    const res = await fetch(`${process.env.QSYNC_API_URL}/qb_sync/tablets`, {
      headers: {
        'X-App-Token': process.env.X_APP_TOKEN ?? '',
        'Authorization': `Bearer ${accessToken}`,
      },
    })
    if (res.ok) {
      const body = await res.json().catch(() => ({}))
      externalTablets = Array.isArray(body.data) ? body.data : []
    } else {
      console.error(`[getAvailableTablets] API returned ${res.status}: ${res.statusText}`)
    }
  } catch (err) {
    console.error('[getAvailableTablets] Network error fetching tablets:', err)
    return []
  }

  // 2. Query local active sessions to determine which tablets are busy
  const activeSessions = await prisma.inspectionSession.findMany({
    where: { status: { not: 'finished' } },
    select: { tabletId: true },
  })
  const busyTabletCodes = new Set(activeSessions.map((s) => s.tabletId))

  // 3. Filter and map to TabletOption
  return externalTablets
    .filter((t) => {
      const codigo = t.codigoTablet ?? t.codigo_tablet ?? ''
      return codigo !== '' && t.status === 'activa' && !busyTabletCodes.has(codigo)
    })
    .map((t) => ({
      id: t.id ?? 0,
      alias: t.alias ?? t.codigoTablet ?? t.codigo_tablet ?? '',
      serialNumber: t.serialNumber ?? t.serial_number ?? '',
      codigoTablet: t.codigoTablet ?? t.codigo_tablet ?? '',
      plantId: t.plantId ?? t.plant_id ?? null,
      plantName: t.plantName ?? t.plant_name ?? null,
      status: t.status ?? '',
    }))
    .sort((a, b) => a.alias.localeCompare(b.alias))
}
