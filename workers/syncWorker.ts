import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { runSyncCycle } from '../back/services/sync/syncOrchestrator';

// Standalone Node process — does NOT import from back/db/legacyDb.ts because
// that module is marked 'server-only' (for Next.js). The worker recreates the
// pool locally with the same configuration.

const legacyUrl = process.env.DATABASE_LEGACY_URL ?? '';
const isLocalLegacy = /@(localhost|127\.0\.0\.1)[:/]/.test(legacyUrl);

const legacyPool = new Pool({
  connectionString: legacyUrl,
  max: 1,
  ssl: isLocalLegacy ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
  statement_timeout: 60_000,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  log: ['error'],
});

async function checkConnectivity(): Promise<void> {
  console.log('[sync] checking connectivity...');
  if (!process.env.DATABASE_LEGACY_URL) {
    throw new Error('DATABASE_LEGACY_URL is not set in .env');
  }
  const legacy = await legacyPool.query<{ now: Date; version: string }>(
    'SELECT NOW() AS now, version() AS version'
  );
  console.log('[sync] legacy OK:', legacy.rows[0].now.toISOString());
  console.log('[sync] legacy version:', legacy.rows[0].version.split(',')[0]);

  const v2 = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() AS now`;
  console.log('[sync] v2 OK:', v2[0].now.toISOString());
}

function parseIntFlag(argv: string[], flag: string): number | undefined {
  const idx = argv.indexOf(flag);
  if (idx === -1) return undefined;
  const n = Number(argv[idx + 1]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

async function main() {
  const mode = process.argv[2] ?? 'cycle';
  const limit = parseIntFlag(process.argv, '--limit');
  const sinceDays = parseIntFlag(process.argv, '--since-days');
  const since = sinceDays
    ? new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000)
    : undefined;
  const triggeredByParts: string[] = ['manual'];
  if (limit) triggeredByParts.push(`limit=${limit}`);
  if (sinceDays) triggeredByParts.push(`since=${sinceDays}d`);
  const triggeredBy = triggeredByParts.join(':');

  try {
    if (mode === 'ping') {
      await checkConnectivity();
      return;
    }
    if (mode !== 'cycle') {
      console.error(`Unknown mode: ${mode}. Use 'ping' or 'cycle [--limit N] [--since-days N]'.`);
      process.exitCode = 1;
      return;
    }

    await checkConnectivity();
    if (limit) console.log(`[sync] running with --limit ${limit} per entity`);
    if (since) console.log(`[sync] cursor pinned to ${since.toISOString()} (--since-days ${sinceDays})`);

    const startMs = Date.now();
    const result = await runSyncCycle(prisma, legacyPool, { triggeredBy, limit, since });
    const durationMs = Date.now() - startMs;

    console.log(`[sync] cycle complete (run id=${result.runId}, status=${result.status}, took ${(durationMs / 1000).toFixed(1)}s)`);
    for (const [entity, s] of Object.entries(result.stats)) {
      console.log(`  ${entity.padEnd(15)} pulled=${s.pulled}  upserted=${s.upserted}  skipped=${s.skipped}  errors=${s.errors}`);
    }
    if (result.status === 'failed') process.exitCode = 1;
  } catch (err) {
    console.error('[sync] failed:', err);
    process.exitCode = 1;
  } finally {
    await legacyPool.end();
    await prisma.$disconnect();
  }
}

main();
