import 'server-only'

function apiHeaders(accessToken: string): Record<string, string> {
  return {
    'X-App-Token': process.env.X_APP_TOKEN ?? '',
    Authorization: `Bearer ${accessToken}`,
  }
}

const BASE = () => process.env.QSYNC_API_URL ?? 'http://localhost:3001'

// ─── Raw shapes from qb_sync ─────────────────────────────────────────────────

interface RawAssignedTablet {
  id: number
  alias: string
  codigoTablet: string
}

interface RawItem {
  id: number
  partNumber: string | null
  partName: string | null
  inventory: string | number | null
  inventoryDone: string | number | null
  sessionId: number | null
  sessionStatus: string | null
  assignedAt: string | null
  assignedTablet: RawAssignedTablet | null
  hasSubmittedReport: boolean
  quotationConsecutive: string | null
  hoe: string | null
  arranqueSeguro: string | null
}

interface RawQuotation {
  id: number
  consecutiveNumber: string | null
  status: string | null
  clientEmail: string | null
  purchaseOrderNumber: string | null
  contactEmails: string | null
  orderUserName: string | null
  orderConsecutiveNumber: string | null
  total: number
}

interface RawOrder {
  id: number
  consecutiveNumber: string | null
  state: string | null
  serviceTypeName: string | null
  serviceTypeDetail: string | null
  piecesPerHour: string | number | null
  authorizedHours: string | number | null
  pricePerHour: string | number | null
  language: string | null
  userName: string | null
  clientContactName: string | null
  clientContactEmail: string | null
  hoe: string | null
  arranqueSeguro: string | null
  clientName: string | null
  plantId: number | null
  plantName: string | null
  regionName: string | null
  quotations: RawQuotation[]
  items: RawItem[]
}

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
  hoe: string | null
  arranqueSeguro: string | null
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

function mapWorkloadOrder(raw: RawOrder): OrderWorkload {
  const items: OrderItemWorkload[] = (raw.items ?? []).map((item) => ({
    id: item.id,
    partNumber: item.partNumber ?? '—',
    partName: item.partName ?? '—',
    status: deriveItemStatus(item.sessionStatus),
    inventario: Number(item.inventory ?? 0),
    inventarioTerminado: Number(item.inventoryDone ?? 0),
    assignedAt: item.assignedAt ? new Date(item.assignedAt) : null,
    assignedTablet: item.assignedTablet
      ? { id: item.assignedTablet.id, alias: item.assignedTablet.alias ?? item.assignedTablet.codigoTablet }
      : null,
    quotationConsecutive: item.quotationConsecutive ?? null,
    hasSubmittedReport: item.hasSubmittedReport ?? false,
    hoe: item.hoe ?? null,
    arranqueSeguro: item.arranqueSeguro ?? null,
  }))

  const firstItem = items[0]

  return {
    id: raw.id,
    consecutiveNumber: raw.consecutiveNumber ?? null,
    clientName: raw.clientName ?? null,
    plantName: raw.plantName ?? '—',
    plantId: raw.plantId ?? null,
    partNumber: firstItem?.partNumber ?? '—',
    partName: firstItem?.partName ?? '—',
    serviceType: raw.serviceTypeName ?? raw.serviceTypeDetail ?? '—',
    orderStatus: raw.state ?? 'open',
    regionName: raw.regionName ?? null,
    serviceTypeDetail: raw.serviceTypeDetail ?? null,
    piecesPerHour: raw.piecesPerHour != null ? Number(raw.piecesPerHour) : null,
    authorizedHours: raw.authorizedHours != null ? Number(raw.authorizedHours) : null,
    pricePerHour: raw.pricePerHour != null ? Number(raw.pricePerHour) : null,
    language: raw.language ?? null,
    userName: raw.userName ?? null,
    clientContactName: raw.clientContactName ?? null,
    clientContactEmail: raw.clientContactEmail ?? null,
    quotations: (raw.quotations ?? []).map((q) => ({
      id: q.id,
      consecutiveNumber: q.consecutiveNumber ?? null,
      status: q.status ?? null,
      total: q.total ?? 0,
      clientEmail: q.clientEmail ?? null,
      purchaseOrderNumber: q.purchaseOrderNumber ?? null,
      contactEmails: q.contactEmails ?? null,
      orderUserName: q.orderUserName ?? null,
      orderConsecutiveNumber: q.orderConsecutiveNumber ?? null,
    })),
    items,
    hoe: raw.hoe ?? null,
    arranqueSeguro: raw.arranqueSeguro ?? null,
  }
}

export async function getCargaDeTrabajoData(accessToken: string): Promise<OrderWorkload[]> {
  const res = await fetch(`${BASE()}/qb_sync/orders/workload`, {
    headers: apiHeaders(accessToken),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`getCargaDeTrabajoData failed: ${res.status}`)
  const body = await res.json() as { success: boolean; data: RawOrder[] }
  return (body.data ?? []).map(mapWorkloadOrder)
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

export async function getOrderWorkloadById(id: number, accessToken: string): Promise<OrderWorkload | null> {
  const all = await getCargaDeTrabajoData(accessToken)
  return all.find((o) => o.id === id) ?? null
}

export async function getAvailableTablets(
  accessToken: string,
  plantaId: number | null = null,
): Promise<TabletOption[]> {
  // 1. Fetch all tablets from qb_sync
  let externalTablets: ExternalTablet[] = []
  try {
    const res = await fetch(`${BASE()}/qb_sync/tablets`, {
      headers: apiHeaders(accessToken),
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

  // 2. Fetch active sessions from qb_sync to determine which tablets are busy
  let busyTabletCodes: Set<string> = new Set()
  try {
    const sessRes = await fetch(`${BASE()}/qb_sync/inspection-sessions/active`, {
      headers: apiHeaders(accessToken),
    })
    if (sessRes.ok) {
      const sessBody = await sessRes.json().catch(() => ({}))
      const activeSessions: Array<{ tabletId?: string }> = Array.isArray(sessBody.data) ? sessBody.data : []
      busyTabletCodes = new Set(
        activeSessions.map((s) => s.tabletId).filter((c): c is string => typeof c === 'string' && c !== ''),
      )
    }
  } catch (err) {
    console.error('[getAvailableTablets] Network error fetching active sessions:', err)
    // Non-fatal — proceed without filtering busy tablets
  }

  // 3. Filter and map to TabletOption
  return externalTablets
    .filter((t) => {
      const codigo = t.codigoTablet ?? t.codigo_tablet ?? ''
      const tabletPlantId = t.plantId ?? t.plant_id ?? null
      const matchesPlant = plantaId == null || tabletPlantId === plantaId
      return codigo !== '' && t.status === 'activa' && !busyTabletCodes.has(codigo) && matchesPlant
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
