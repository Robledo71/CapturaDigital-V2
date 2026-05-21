// Row types returned by legacy read repos. Mirrored from schema-legacy.prisma.
// IDs are cast to text in SQL to avoid pg's default BIGINT → JS Number coercion
// (legacy ids can grow beyond Number.MAX_SAFE_INTEGER over time).
// Decimal columns are also serialized as strings by node-postgres by default.

export type LegacyClientRow = {
  id: string;
  name: string | null;
  address: string | null;
  require_purchase_order: boolean | null;
  created_at: Date;
  updated_at: Date;
};

export type LegacyPlantRow = {
  id: string;
  name: string | null;
  address: string | null;
  created_at: Date;
  updated_at: Date;
};

export type LegacyOrderRow = {
  id: string;
  consecutive_number: string | null;
  state: string | null;
  client_id: string | null;
  plant_id: string | null;
  service_type_name: string | null;
  plant_name: string | null;
  client_name: string | null;
  first_part_number: string | null;
  first_part_name: string | null;
  created_at: Date;
  updated_at: Date;
};

export type LegacyQuotationRow = {
  id: string;
  consecutive_number: string | null;
  status: string | null;
  order_id: string | null;
  subtotal: string | null;
  total: string | null;
  created_at: Date;
  updated_at: Date;
};

export type LegacyDailyReportRow = {
  id: string;
  consecutive_number: string | null;
  order_id: string | null;
  quotation_id: string | null;
  total_inspected: string | null;
  total_ok: string | null;
  total_ng: string | null;
  total_recovered: string | null;
  total_scrap: string | null;
  observations: string | null;
  csv_table: unknown;
  order_status: string | null;
  quotation_status: string | null;
  created_at: Date;
  updated_at: Date;
};
