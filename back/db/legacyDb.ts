import 'server-only';
import { Pool } from 'pg';

const createLegacyPool = () => {
  const connectionString = process.env.DATABASE_LEGACY_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_LEGACY_URL is not set. The legacy sync pipeline requires read-only access to the Rails system PostgreSQL on Heroku.'
    );
  }
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
  return new Pool({
    connectionString,
    max: 1,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 30_000,
  });
};

const globalForLegacyPool = globalThis as unknown as {
  legacyPool: Pool | undefined;
};

export const legacyPool = globalForLegacyPool.legacyPool ?? createLegacyPool();

if (process.env.NODE_ENV !== 'production') {
  globalForLegacyPool.legacyPool = legacyPool;
}

export async function queryLegacy<T extends Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await legacyPool.query<T>(sql, params);
  return result.rows;
}

export async function pingLegacy(): Promise<{ ok: true; now: Date } | { ok: false; error: string }> {
  try {
    const rows = await queryLegacy<{ now: Date }>('SELECT NOW() AS now');
    return { ok: true, now: rows[0].now };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
