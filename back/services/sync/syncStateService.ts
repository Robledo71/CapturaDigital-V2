import type { PrismaClient } from '@prisma/client';

export type SyncEntity =
  | 'clients'
  | 'plants'
  | 'orders'
  | 'quotations'
  | 'daily_reports';

export async function getLastSuccessfulSyncAt(
  prisma: PrismaClient,
  entity: SyncEntity
): Promise<Date | null> {
  const state = await prisma.syncState.findUnique({
    where: { entity },
    select: { lastSuccessfulSyncAt: true },
  });
  return state?.lastSuccessfulSyncAt ?? null;
}

export async function markSyncAttempt(
  prisma: PrismaClient,
  entity: SyncEntity,
  attemptAt: Date
): Promise<void> {
  await prisma.syncState.upsert({
    where: { entity },
    create: { entity, lastAttemptAt: attemptAt },
    update: { lastAttemptAt: attemptAt, lastError: null },
  });
}

export async function markSyncSuccess(
  prisma: PrismaClient,
  entity: SyncEntity,
  successAt: Date
): Promise<void> {
  await prisma.syncState.upsert({
    where: { entity },
    create: {
      entity,
      lastSuccessfulSyncAt: successAt,
      lastAttemptAt: successAt,
    },
    update: { lastSuccessfulSyncAt: successAt, lastError: null },
  });
}

export async function markSyncFailure(
  prisma: PrismaClient,
  entity: SyncEntity,
  error: string
): Promise<void> {
  await prisma.syncState.upsert({
    where: { entity },
    create: { entity, lastAttemptAt: new Date(), lastError: error },
    update: { lastAttemptAt: new Date(), lastError: error },
  });
}

export type EntityStats = {
  pulled: number;
  upserted: number;
  skipped: number;
  errors: number;
};

export type SyncRunStats = Record<SyncEntity, EntityStats>;

export function newRunStats(): SyncRunStats {
  return {
    clients: { pulled: 0, upserted: 0, skipped: 0, errors: 0 },
    plants: { pulled: 0, upserted: 0, skipped: 0, errors: 0 },
    orders: { pulled: 0, upserted: 0, skipped: 0, errors: 0 },
    quotations: { pulled: 0, upserted: 0, skipped: 0, errors: 0 },
    daily_reports: { pulled: 0, upserted: 0, skipped: 0, errors: 0 },
  };
}

export async function recordSyncRun(
  prisma: PrismaClient,
  args: {
    startedAt: Date;
    completedAt: Date;
    status: 'ok' | 'partial' | 'failed';
    stats: SyncRunStats;
    error?: string;
    triggeredBy?: string;
  }
): Promise<number> {
  const run = await prisma.syncRun.create({
    data: {
      startedAt: args.startedAt,
      completedAt: args.completedAt,
      status: args.status,
      stats: args.stats as unknown as object,
      error: args.error,
      triggeredBy: args.triggeredBy ?? 'cron',
    },
    select: { id: true },
  });
  return run.id;
}
