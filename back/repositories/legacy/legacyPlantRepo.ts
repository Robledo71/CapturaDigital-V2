import type { Pool } from 'pg';
import type { LegacyPlantRow } from './types';

export async function fetchPlantsUpdatedSince(
  pool: Pool,
  since: Date | null
): Promise<LegacyPlantRow[]> {
  const sql = `
    SELECT id::text AS id,
           name,
           address,
           created_at,
           updated_at
    FROM plants
    ${since ? 'WHERE updated_at > $1' : ''}
    ORDER BY updated_at ASC, id ASC
  `;
  const result = await pool.query<LegacyPlantRow>(sql, since ? [since] : []);
  return result.rows;
}
