import type { Pool } from 'pg';
import type { LegacyQuotationRow } from './types';

export async function fetchQuotationsUpdatedSince(
  pool: Pool,
  since: Date | null
): Promise<LegacyQuotationRow[]> {
  const sql = `
    SELECT id::text         AS id,
           consecutive_number,
           status,
           order_id::text    AS order_id,
           subtotal::text    AS subtotal,
           total::text       AS total,
           created_at,
           updated_at
    FROM quotations
    ${since ? 'WHERE updated_at > $1' : ''}
    ORDER BY updated_at ASC, id ASC
  `;
  const result = await pool.query<LegacyQuotationRow>(sql, since ? [since] : []);
  return result.rows;
}
