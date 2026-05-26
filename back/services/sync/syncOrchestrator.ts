// TODO Fase 4: sync deshabilitado — modelos SyncState, SyncRun, Client eliminados del esquema.
import type { SyncRunStats } from './syncStateService'
import { newRunStats } from './syncStateService'

export type RunSyncOptions = {
  triggeredBy?: string
  limit?: number
  since?: Date
}

export type RunSyncResult = {
  runId: number
  status: 'ok' | 'partial' | 'failed'
  stats: SyncRunStats
  error?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runSyncCycle(_prisma: any, _legacyPool: any, _opts: RunSyncOptions = {}): Promise<RunSyncResult> {
  return {
    runId: 0,
    status: 'failed',
    stats: newRunStats(),
    error: 'sync disabled',
  }
}
