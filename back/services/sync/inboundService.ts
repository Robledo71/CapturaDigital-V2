// TODO Fase 4: sync deshabilitado — modelos eliminados (Client, SyncState, SyncRun, legacyId en DailyReport).
// inboundService stubbeado.
import 'server-only'

import type { InboundPayload } from '@/back/validators/inboundSchemas'

export type InboundError =
  | 'CLIENT_NOT_FOUND'
  | 'PLANT_NOT_FOUND'
  | 'ORDER_NOT_FOUND'
  | 'MISSING_PARENT_ID'
  | 'INTERNAL_ERROR'

export type InboundResult =
  | { ok: true; type: string; v2Id: number; legacyId: number }
  | { ok: false; error: InboundError; message: string }

export async function processInboundPayload(_payload: InboundPayload): Promise<InboundResult> {
  return {
    ok: false,
    error: 'INTERNAL_ERROR',
    message: 'Inbound sync deshabilitado temporalmente — Fase 4 pendiente',
  }
}

// Alias used by the inbound route
export const ingestInbound = processInboundPayload
