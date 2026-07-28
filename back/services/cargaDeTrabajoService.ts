import 'server-only'

function apiHeaders(accessToken: string): Record<string, string> {
  return {
    'X-App-Token': process.env.X_APP_TOKEN ?? '',
    Authorization: `Bearer ${accessToken}`,
  }
}

const BASE = () => process.env.QSYNC_API_URL ?? 'http://localhost:3001'

// ─── Raw shapes from qb_sync ─────────────────────────────────────────────────

interface RawAssignedInspector {
  id: number
  name: string
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
  assignedInspectors: RawAssignedInspector[] | null
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
  assignedInspectors: { id: number; name: string }[]
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

export type InspectorOption = {
  empleadoId: number
  name: string
  plantIds: number[]
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
    assignedInspectors: item.assignedInspectors ?? [],
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

type ExternalUser = {
  empleado_id?: number | string
  empleadoId?: number | string
  id?: number
  codigo_empleado?: string
  nombre_completo?: string
  nombreCompleto?: string
  planta_id?: number | null
  plantaId?: number | null
  planta_nombre?: string | null
  plantaNombre?: string | null
  plantas?: { id: number; nombre: string }[]
  rol?: string
  correo?: string
  is_active?: boolean
}

export async function getOrderWorkloadById(id: number, accessToken: string): Promise<OrderWorkload | null> {
  const all = await getCargaDeTrabajoData(accessToken)
  return all.find((o) => o.id === id) ?? null
}

export async function getAvailableInspectors(
  accessToken: string,
  plantaId: number | null = null,
): Promise<InspectorOption[]> {
  let externalUsers: ExternalUser[] = []
  try {
    const res = await fetch(`${BASE()}/qb_sync/users`, {
      headers: apiHeaders(accessToken),
    })
    if (res.ok) {
      const body = await res.json().catch(() => ({}))
      externalUsers = Array.isArray(body.data) ? body.data : []
    } else {
      console.error(`[getAvailableInspectors] API returned ${res.status}: ${res.statusText}`)
      return []
    }
  } catch (err) {
    console.error('[getAvailableInspectors] Network error fetching users:', err)
    return []
  }

  // Prefiere el arreglo completo de plantas activas del usuario; si el backend
  // aún no lo trae, cae a la planta única legacy (planta_id) como único elemento.
  function derivePlantIds(u: ExternalUser): number[] {
    if (Array.isArray(u.plantas)) return u.plantas.map((p) => p.id)
    const legacyPlantId = u.planta_id ?? u.plantaId ?? null
    return legacyPlantId != null ? [legacyPlantId] : []
  }

  return externalUsers
    .filter((u) => {
      const rol = String(u.rol ?? '').toLowerCase()
      if (rol !== 'inspector') return false
      const empleadoId = u.empleado_id ?? u.empleadoId
      if (empleadoId == null || empleadoId === '') return false
      const matchesPlant = plantaId == null || derivePlantIds(u).includes(plantaId)
      return matchesPlant
    })
    .map((u) => ({
      empleadoId: Number(u.empleado_id ?? u.empleadoId),
      name: u.nombre_completo ?? u.nombreCompleto ?? '',
      plantIds: derivePlantIds(u),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
