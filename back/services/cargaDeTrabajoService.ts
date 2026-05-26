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
  quotations: QuotationSummary[]
  items: OrderItemWorkload[]
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
  if (sessionStatus === 'asignado') return 'assigned'
  if (sessionStatus === 'en_progreso') return 'in_progress'
  return 'assigned'
}

export async function getCargaDeTrabajoData(_supervisorCodigoEmpleado: string): Promise<OrderWorkload[]> {
  const orders = await prisma.order.findMany({
    where: { NOT: { state: 'cerrada' } },
    include: {
      plant: { select: { id: true, name: true } },
      quotations: {
        include: {
          items: {
            include: {
              sessions: {
                where: { status: { not: 'finalizado' } },
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

  // Batch-fetch tablets referenced in active sessions
  const codigosTablet = new Set<string>()
  for (const order of orders) {
    for (const quotation of order.quotations) {
      for (const item of quotation.items) {
        const session = item.sessions[0]
        if (session?.tabletId) codigosTablet.add(session.tabletId)
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

  return orders.map((order) => {
    const allItems: OrderItemWorkload[] = order.quotations.flatMap((quotation) =>
      quotation.items.map((item) => {
        const activeSession = item.sessions[0] ?? null
        const tabletRecord = activeSession ? tabletByCode.get(activeSession.tabletId) : null

        return {
          id: item.id,
          partNumber: item.partNumber ?? '—',
          partName: item.partName ?? '—',
          status: deriveItemStatus(activeSession?.status ?? null),
          inventario: item.inventory ? Number(item.inventory) : 0,
          inventarioTerminado: item.inventoryDone ? Number(item.inventoryDone) : 0,
          assignedAt: activeSession?.fechaInicio ?? null,
          assignedTablet: tabletRecord
            ? { id: tabletRecord.id, alias: tabletRecord.alias ?? tabletRecord.codigoTablet }
            : null,
          quotationConsecutive: quotation.consecutiveNumber,
        }
      }),
    )

    const firstItem = allItems[0]

    return {
      id: order.id,
      consecutiveNumber: order.consecutiveNumber,
      clientName: order.clientName,
      plantName: order.plant?.name ?? '—',
      plantId: order.plant?.id ?? null,
      partNumber: firstItem?.partNumber ?? '—',
      partName: firstItem?.partName ?? '—',
      serviceType: order.serviceTypeName ?? order.serviceTypeDetail ?? '—',
      orderStatus: order.state ?? 'abierta',
      quotations: order.quotations.map((q) => ({
        id: q.id,
        consecutiveNumber: q.consecutiveNumber,
        status: q.status,
        total: 0,
      })),
      items: allItems,
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
    }
  } catch {
    return []
  }

  // 2. Query local active sessions to determine which tablets are busy
  const activeSessions = await prisma.inspectionSession.findMany({
    where: { status: { not: 'finalizado' } },
    select: { tabletId: true },
  })
  const busyTabletCodes = new Set(activeSessions.map((s) => s.tabletId))

  // 3. Filter and map to TabletOption
  return externalTablets
    .filter((t) => {
      const codigo = t.codigoTablet ?? t.codigo_tablet ?? ''
      return codigo !== '' && !busyTabletCodes.has(codigo)
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
