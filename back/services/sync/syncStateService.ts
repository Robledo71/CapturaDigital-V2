// TODO Fase 4: sync deshabilitado — SyncState y SyncRun eliminados del esquema.

export type SyncEntity =
  | 'clients'
  | 'plants'
  | 'orders'
  | 'quotations'
  | 'daily_reports'

export type EntityStats = {
  pulled: number
  upserted: number
  skipped: number
  errors: number
}

export type SyncRunStats = Record<SyncEntity, EntityStats>

export function newRunStats(): SyncRunStats {
  return {
    clients: { pulled: 0, upserted: 0, skipped: 0, errors: 0 },
    plants: { pulled: 0, upserted: 0, skipped: 0, errors: 0 },
    orders: { pulled: 0, upserted: 0, skipped: 0, errors: 0 },
    quotations: { pulled: 0, upserted: 0, skipped: 0, errors: 0 },
    daily_reports: { pulled: 0, upserted: 0, skipped: 0, errors: 0 },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getLastSuccessfulSyncAt(_prisma: any, _entity: SyncEntity): Promise<Date | null> {
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function markSyncAttempt(_prisma: any, _entity: SyncEntity, _attemptAt: Date): Promise<void> {}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function markSyncSuccess(_prisma: any, _entity: SyncEntity, _successAt: Date): Promise<void> {}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function markSyncFailure(_prisma: any, _entity: SyncEntity, _error: string): Promise<void> {}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function recordSyncRun(_prisma: any, _args: any): Promise<number> {
  return 0
}
