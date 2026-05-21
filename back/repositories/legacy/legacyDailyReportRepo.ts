import type { Pool } from 'pg';
import type { LegacyDailyReportRow } from './types';

// Filter rules:
//   * consecutive_number NOT NULL: probe found 0 nulls in 26,866 rows, but the
//     after_create callback in Rails has a microwindow where this could be null
//     between INSERT and the callback firing. Skip defensively.
//   * order_id NOT NULL: required by v2 (DailyReport.orderId is NOT NULL).
//   * quotation_id MAY be null: ~0.6% of legacy daily_reports have it; user
//     decided to sync them anyway (DailyReport.quotationId is nullable in v2).
export async function fetchDailyReportsUpdatedSince(
  pool: Pool,
  since: Date | null
): Promise<LegacyDailyReportRow[]> {
  const sql = `
    SELECT id::text                  AS id,
           consecutive_number,
           order_id::text              AS order_id,
           quotation_id::text          AS quotation_id,
           total_inspected::text       AS total_inspected,
           total_ok::text              AS total_ok,
           total_ng::text              AS total_ng,
           total_recovered::text       AS total_recovered,
           total_scrap::text           AS total_scrap,
           observations,
           csv_table,
           order_status,
           quotation_status,
           created_at,
           updated_at
    FROM daily_reports
    WHERE consecutive_number IS NOT NULL
      AND order_id IS NOT NULL
      ${since ? 'AND updated_at > $1' : ''}
    ORDER BY updated_at ASC, id ASC
  `;
  const result = await pool.query<LegacyDailyReportRow>(sql, since ? [since] : []);
  return result.rows;
}
