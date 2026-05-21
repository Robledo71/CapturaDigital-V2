import type { Pool } from 'pg';
import type { LegacyClientRow } from './types';

export async function fetchClientsUpdatedSince(
  pool: Pool,
  since: Date | null
): Promise<LegacyClientRow[]> {
  const sql = `
    SELECT id::text AS id,
           name,
           address,
           require_purchase_order,
           created_at,
           updated_at
    FROM clients
    ${since ? 'WHERE updated_at > $1' : ''}
    ORDER BY updated_at ASC, id ASC
  `;
  const result = await pool.query<LegacyClientRow>(sql, since ? [since] : []);
  return result.rows;
}
