import type { PrismaClient } from '@prisma/client';
import type { Pool } from 'pg';

import { fetchClientsUpdatedSince } from '../../repositories/legacy/legacyClientRepo';
import { fetchDailyReportsUpdatedSince } from '../../repositories/legacy/legacyDailyReportRepo';
import { fetchOrdersUpdatedSince } from '../../repositories/legacy/legacyOrderRepo';
import { fetchPlantsUpdatedSince } from '../../repositories/legacy/legacyPlantRepo';
import { fetchQuotationsUpdatedSince } from '../../repositories/legacy/legacyQuotationRepo';

import {
  buildPlantToSupervisorMap,
  matchSupervisorByPlanta,
} from './supervisorMatchService';
import {
  getLastSuccessfulSyncAt,
  markSyncAttempt,
  markSyncFailure,
  markSyncSuccess,
  newRunStats,
  recordSyncRun,
  type SyncEntity,
  type SyncRunStats,
} from './syncStateService';
import {
  transformClient,
  transformDailyReport,
  transformOrder,
  transformPlant,
  transformQuotation,
} from './transformService';
import {
  upsertClient,
  upsertDailyReport,
  upsertOrder,
  upsertPlant,
  upsertQuotation,
} from './upsertService';

// In-memory legacyId(bigint) → v2 id(number) maps.
// Pre-loaded once per cycle instead of doing 1 SELECT per row (would add ~50ms
// per row over cloud Postgres → unbearable for the initial ~80k-row sync).
type IdMap = Map<bigint, number>;

async function loadIdMap(
  prisma: PrismaClient,
  model: 'client' | 'plant' | 'order' | 'quotation'
): Promise<IdMap> {
  const map: IdMap = new Map();
  let rows: Array<{ id: number; legacyId: bigint | null }>;
  switch (model) {
    case 'client':
      rows = await prisma.client.findMany({
        where: { legacyId: { not: null } },
        select: { id: true, legacyId: true },
      });
      break;
    case 'plant':
      rows = await prisma.plant.findMany({
        where: { legacyId: { not: null } },
        select: { id: true, legacyId: true },
      });
      break;
    case 'order':
      rows = await prisma.order.findMany({
        where: { legacyId: { not: null } },
        select: { id: true, legacyId: true },
      });
      break;
    case 'quotation':
      rows = await prisma.quotation.findMany({
        where: { legacyId: { not: null } },
        select: { id: true, legacyId: true },
      });
      break;
  }
  for (const r of rows) {
    if (r.legacyId !== null) map.set(r.legacyId, r.id);
  }
  return map;
}

// Sync runs in this strict order. If a step fails to pull from legacy, the
// downstream entities are skipped (their parent ids wouldn't resolve anyway).
// Per-row errors don't abort the entity; they're counted in stats.errors.
const ENTITY_ORDER: SyncEntity[] = [
  'clients',
  'plants',
  'orders',
  'quotations',
  'daily_reports',
];

export type RunSyncOptions = {
  triggeredBy?: string;
  limit?: number;
  /**
   * Initial cursor for this run. If set, the sync pulls rows with
   * `updated_at > since` instead of using the persisted sync_state cursor.
   * Useful for backfills ("last 90 days only") without touching old data.
   * After a successful entity sync, sync_state.lastSuccessfulSyncAt is
   * still updated (so the next cron pass picks up from where this one left off).
   */
  since?: Date;
};

export type RunSyncResult = {
  runId: number;
  status: 'ok' | 'partial' | 'failed';
  stats: SyncRunStats;
  error?: string;
};

export async function runSyncCycle(
  prisma: PrismaClient,
  legacyPool: Pool,
  opts: RunSyncOptions = {}
): Promise<RunSyncResult> {
  const startedAt = new Date();
  const stats = newRunStats();
  const aborted: Set<SyncEntity> = new Set();

  const supervisorMap = await buildPlantToSupervisorMap(prisma);

  // Per-cycle in-memory id maps. Refreshed after each upsert step so children
  // can resolve parents that were just inserted in the same cycle.
  const ctx: SyncCtx = {
    prisma,
    pool: legacyPool,
    supervisorMap,
    limit: opts.limit,
    stats,
    clientMap: new Map(),
    plantMap: new Map(),
    orderMap: new Map(),
    quotationMap: new Map(),
  };

  // Partial runs (--limit) don't touch sync_state — they're sandboxed test
  // passes that re-fetch the same first-N rows on each invocation.
  const isLimitedSandbox = (opts.limit ?? 0) > 0;

  for (const entity of ENTITY_ORDER) {
    if (aborted.has(entity)) continue;

    // Cursor resolution priority:
    //   1. opts.since (explicit backfill cutoff) — overrides persisted state
    //   2. persisted lastSuccessfulSyncAt (incremental cron behavior)
    //   3. null (full sync — only on very first run)
    const since = opts.since ?? (await getLastSuccessfulSyncAt(prisma, entity));
    const attemptAt = new Date();
    if (!isLimitedSandbox) await markSyncAttempt(prisma, entity, attemptAt);

    try {
      await syncEntity(entity, since, ctx);
      if (!isLimitedSandbox) await markSyncSuccess(prisma, entity, attemptAt);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!isLimitedSandbox) await markSyncFailure(prisma, entity, msg);
      stats[entity].errors += 1;
      // Cascade abort to dependent entities.
      for (const downstream of dependentsOf(entity)) {
        aborted.add(downstream);
      }
    }
  }

  const completedAt = new Date();
  const totalErrors = ENTITY_ORDER.reduce((acc, e) => acc + stats[e].errors, 0);
  const totalUpserted = ENTITY_ORDER.reduce((acc, e) => acc + stats[e].upserted, 0);
  const status: RunSyncResult['status'] =
    totalErrors === 0 ? 'ok' : totalUpserted > 0 ? 'partial' : 'failed';

  const runId = await recordSyncRun(prisma, {
    startedAt,
    completedAt,
    status,
    stats,
    triggeredBy: opts.triggeredBy ?? 'cron',
  });

  return { runId, status, stats };
}

function dependentsOf(entity: SyncEntity): SyncEntity[] {
  switch (entity) {
    case 'clients':
    case 'plants':
      return ['orders', 'quotations', 'daily_reports'];
    case 'orders':
      return ['quotations', 'daily_reports'];
    case 'quotations':
      return ['daily_reports'];
    default:
      return [];
  }
}

type SyncCtx = {
  prisma: PrismaClient;
  pool: Pool;
  supervisorMap: Map<string, string>;
  limit?: number;
  stats: SyncRunStats;
  clientMap: IdMap;
  plantMap: IdMap;
  orderMap: IdMap;
  quotationMap: IdMap;
};

function maybeLimit<T>(rows: T[], limit?: number): T[] {
  return limit && rows.length > limit ? rows.slice(0, limit) : rows;
}

async function syncEntity(
  entity: SyncEntity,
  since: Date | null,
  ctx: SyncCtx
): Promise<void> {
  switch (entity) {
    case 'clients':
      return syncClients(since, ctx);
    case 'plants':
      return syncPlants(since, ctx);
    case 'orders':
      return syncOrders(since, ctx);
    case 'quotations':
      return syncQuotations(since, ctx);
    case 'daily_reports':
      return syncDailyReports(since, ctx);
  }
}

async function syncClients(since: Date | null, ctx: SyncCtx): Promise<void> {
  // Clients & plants are small reference tables; always full-sync them so that
  // limited orders/quotations/daily_reports can resolve their parents.
  const rows = await fetchClientsUpdatedSince(ctx.pool, since);
  ctx.stats.clients.pulled = rows.length;
  for (const row of rows) {
    try {
      const v2Id = await upsertClient(ctx.prisma, transformClient(row));
      ctx.clientMap.set(BigInt(row.id), v2Id);
      ctx.stats.clients.upserted += 1;
    } catch (err) {
      console.error(`[sync] client ${row.id} failed:`, err);
      ctx.stats.clients.errors += 1;
    }
  }
}

async function syncPlants(since: Date | null, ctx: SyncCtx): Promise<void> {
  const rows = await fetchPlantsUpdatedSince(ctx.pool, since);
  ctx.stats.plants.pulled = rows.length;
  for (const row of rows) {
    try {
      const v2Id = await upsertPlant(ctx.prisma, transformPlant(row));
      ctx.plantMap.set(BigInt(row.id), v2Id);
      ctx.stats.plants.upserted += 1;
    } catch (err) {
      console.error(`[sync] plant ${row.id} failed:`, err);
      ctx.stats.plants.errors += 1;
    }
  }
}

async function syncOrders(since: Date | null, ctx: SyncCtx): Promise<void> {
  // Refresh client+plant maps so orders pulled in this cycle find parents
  // synced earlier in the same cycle.
  ctx.clientMap = await loadIdMap(ctx.prisma, 'client');
  ctx.plantMap = await loadIdMap(ctx.prisma, 'plant');

  const rows = maybeLimit(await fetchOrdersUpdatedSince(ctx.pool, since), ctx.limit);
  ctx.stats.orders.pulled = rows.length;
  for (const row of rows) {
    try {
      if (!row.client_id || !row.plant_id) {
        ctx.stats.orders.skipped += 1;
        continue;
      }
      const clientV2Id = ctx.clientMap.get(BigInt(row.client_id));
      const plantV2Id = ctx.plantMap.get(BigInt(row.plant_id));
      if (clientV2Id === undefined || plantV2Id === undefined) {
        // Parent not synced yet; skip — next cycle will catch up.
        ctx.stats.orders.skipped += 1;
        continue;
      }
      const supervisorId = matchSupervisorByPlanta(ctx.supervisorMap, row.plant_name);
      const v2Id = await upsertOrder(
        ctx.prisma,
        transformOrder(row, clientV2Id, plantV2Id, supervisorId)
      );
      ctx.orderMap.set(BigInt(row.id), v2Id);
      ctx.stats.orders.upserted += 1;
    } catch (err) {
      console.error(`[sync] order ${row.id} failed:`, err);
      ctx.stats.orders.errors += 1;
    }
  }
}

async function syncQuotations(since: Date | null, ctx: SyncCtx): Promise<void> {
  ctx.orderMap = await loadIdMap(ctx.prisma, 'order');

  const rows = maybeLimit(await fetchQuotationsUpdatedSince(ctx.pool, since), ctx.limit);
  ctx.stats.quotations.pulled = rows.length;
  for (const row of rows) {
    try {
      if (!row.order_id) {
        ctx.stats.quotations.skipped += 1;
        continue;
      }
      const orderV2Id = ctx.orderMap.get(BigInt(row.order_id));
      if (orderV2Id === undefined) {
        ctx.stats.quotations.skipped += 1;
        continue;
      }
      const v2Id = await upsertQuotation(ctx.prisma, transformQuotation(row, orderV2Id));
      ctx.quotationMap.set(BigInt(row.id), v2Id);
      ctx.stats.quotations.upserted += 1;
    } catch (err) {
      console.error(`[sync] quotation ${row.id} failed:`, err);
      ctx.stats.quotations.errors += 1;
    }
  }
}

async function syncDailyReports(since: Date | null, ctx: SyncCtx): Promise<void> {
  ctx.orderMap = await loadIdMap(ctx.prisma, 'order');
  ctx.quotationMap = await loadIdMap(ctx.prisma, 'quotation');

  const rows = maybeLimit(await fetchDailyReportsUpdatedSince(ctx.pool, since), ctx.limit);
  ctx.stats.daily_reports.pulled = rows.length;
  for (const row of rows) {
    try {
      if (!row.order_id) {
        ctx.stats.daily_reports.skipped += 1;
        continue;
      }
      const orderV2Id = ctx.orderMap.get(BigInt(row.order_id));
      if (orderV2Id === undefined) {
        ctx.stats.daily_reports.skipped += 1;
        continue;
      }
      const quotationV2Id = row.quotation_id
        ? (ctx.quotationMap.get(BigInt(row.quotation_id)) ?? null)
        : null;
      // Note: when row.quotation_id IS NOT NULL but the quotation hasn't been
      // synced yet, we still upsert the DR with quotationId=null. Next cycle
      // won't fix it unless the row is touched in legacy. Acceptable trade-off
      // for MVP; if it becomes a problem, add a reconciliation pass.
      await upsertDailyReport(
        ctx.prisma,
        transformDailyReport(row, orderV2Id, quotationV2Id)
      );
      ctx.stats.daily_reports.upserted += 1;
    } catch (err) {
      console.error(`[sync] daily_report ${row.id} failed:`, err);
      ctx.stats.daily_reports.errors += 1;
    }
  }
}
