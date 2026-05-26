// Shared DTOs for the Flutter tablet API (Sprint 4).
// These types are used by route handlers, services, and repositories.
// They intentionally avoid Prisma-generated types to keep the public API
// surface stable even if the schema evolves.

// ─── Auth ────────────────────────────────────────────────────────────────────

export type TabletLoginResponse = {
  token: string
  tablet: {
    id: number
    alias: string | null
    codigoTablet: string
    plantId: number | null
    plantName: string | null
  }
}

// ─── Assigned Items ───────────────────────────────────────────────────────────

/** Shape of each item returned by GET /api/tablet/items */
export type AssignedItemDto = {
  id: number
  orderId: number
  orderConsecutiveNumber: string | null
  quotationId: number | null
  quotationConsecutiveNumber: string | null
  clientName: string
  plantName: string
  partNumber: string
  partName: string
  inventario: string       // Decimal serialised as string to avoid float precision loss
  inventarioTerminado: string
  incidente: string | null
  status: string           // 'assigned' | 'in_progress'
  assignedAt: string | null
}

// ─── Iniciar ─────────────────────────────────────────────────────────────────

export type IniciarItemRequest = {
  operadores: string
  shift?: number
  reportDate: string       // ISO date YYYY-MM-DD
}

export type IniciarItemResponse = {
  sessionId: number
  dailyReportId: number
  orderItemId: number
}

// ─── Submit Items ─────────────────────────────────────────────────────────────

export type SubmitInspectionItemInput = {
  description?: string
  inspected: number
  ok: number
  ng: number
  scrap: number
  recovered: number
  lote?: string
  series?: string
  otro?: string
  incidents?: Record<string, unknown>
}

export type SubmitItemsRequest = {
  items: SubmitInspectionItemInput[]
}

export type CreatedInspectionItemDto = {
  id: number
  description: string | null
  inspected: string
  ok: string
  ng: string
  scrap: string
  recovered: string
  lote: string | null
  series: string | null
  otro: string | null
}

export type RunningTotals = {
  inspected: string
  ok: string
  ng: string
  scrap: string
  recovered: string
}

export type SubmitItemsResponse = {
  items: CreatedInspectionItemDto[]
  totalsRunning: RunningTotals
}

// ─── Finalizar ────────────────────────────────────────────────────────────────

export type FinalizarSessionResponse = {
  sessionId: number
  totalsForSession: RunningTotals
  dailyReportTotals: RunningTotals
}
