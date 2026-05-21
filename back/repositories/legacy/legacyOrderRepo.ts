import type { Pool } from 'pg';
import type { LegacyOrderRow } from './types';

// order_items in legacy can have N rows per order, each with a different part.
// We pick the first by id as a representative for Order.partNumber/partName in v2.
// The supervisor's listing only shows this as a label — the source of truth per
// item lives in daily_reports.csv_table for legacy, or in inspection_items for v2-native.
export async function fetchOrdersUpdatedSince(
  pool: Pool,
  since: Date | null
): Promise<LegacyOrderRow[]> {
  const sql = `
    SELECT o.id::text                AS id,
           o.consecutive_number,
           o.state,
           o.client_id::text          AS client_id,
           o.plant_id::text           AS plant_id,
           o.service_type_name,
           o.plant_name,
           o.client_name,
           (SELECT oi.part_number
              FROM order_items oi
              WHERE oi.order_id = o.id
              ORDER BY oi.id ASC
              LIMIT 1)                 AS first_part_number,
           (SELECT oi.part_name
              FROM order_items oi
              WHERE oi.order_id = o.id
              ORDER BY oi.id ASC
              LIMIT 1)                 AS first_part_name,
           o.created_at,
           o.updated_at
    FROM orders o
    ${since ? 'WHERE o.updated_at > $1' : ''}
    ORDER BY o.updated_at ASC, o.id ASC
  `;
  const result = await pool.query<LegacyOrderRow>(sql, since ? [since] : []);
  return result.rows;
}
