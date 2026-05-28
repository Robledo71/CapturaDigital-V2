import type { Prisma } from '@prisma/client';
import type {
  LegacyClientRow,
  LegacyDailyReportRow,
  LegacyOrderRow,
  LegacyPlantRow,
  LegacyQuotationRow,
} from '../../repositories/legacy/types';

// Pure transforms: legacy DB row -> v2 Prisma data shape.
// No I/O, no parent-id lookups — those are resolved by the upsert layer and
// passed in as arguments. This keeps these functions trivially unit-testable.

export type ClientCreateData = {
  legacyId: bigint;
  name: string;
  address: string | null;
  requirePurchaseOrder: boolean;
  syncedAt: Date;
};

export type PlantCreateData = {
  legacyId: bigint;
  name: string;
  address: string | null;
  syncedAt: Date;
};

export type OrderCreateData = {
  legacyId: bigint;
  consecutiveNumber: string;
  status: string;
  legacyStatus: string | null;
  clientId: number;
  plantId: number;
  supervisorId: string | null;
  partNumber: string | null;
  partName: string | null;
  serviceType: string | null;
  syncedAt: Date;
};

export type QuotationCreateData = {
  legacyId: bigint;
  consecutiveNumber: string;
  status: string;
  orderId: number;
  subtotal: Prisma.Decimal | string;
  total: Prisma.Decimal | string;
  syncedAt: Date;
};

export type DailyReportCreateData = {
  legacyId: bigint;
  consecutiveNumber: string;
  orderId: number;
  quotationId: number | null;
  reportDate: Date;
  status: 'pending' | 'submitted' | 'sampling' | 'signed' | 'published';
  publishedAt: Date | null;
  signedAt: Date | null;
  totalInspected: Prisma.Decimal | string;
  totalOk: Prisma.Decimal | string;
  totalNg: Prisma.Decimal | string;
  totalScrap: Prisma.Decimal | string;
  totalRecovered: Prisma.Decimal | string;
  observations: string | null;
  legacyCsvTable: unknown;
  legacyStatus: string | null;
  source: 'legacy' | 'v2';
  syncedAt: Date;
};

export function transformClient(row: LegacyClientRow): ClientCreateData {
  return {
    legacyId: BigInt(row.id),
    name: row.name ?? '(sin nombre)',
    address: row.address,
    requirePurchaseOrder: row.require_purchase_order ?? false,
    syncedAt: new Date(),
  };
}

export function transformPlant(row: LegacyPlantRow): PlantCreateData {
  return {
    legacyId: BigInt(row.id),
    name: row.name ?? '(sin nombre)',
    address: row.address,
    syncedAt: new Date(),
  };
}

// Legacy `orders.state` only has two values (state_machine: abierta/cerrada).
// Map to current English enum values; raw legacy value is preserved in legacyStatus.
function mapOrderStatus(state: string | null): string {
  if (state === 'cerrada') return 'closed';
  return 'open';
}

export function transformOrder(
  row: LegacyOrderRow,
  clientV2Id: number,
  plantV2Id: number,
  supervisorId: string | null
): OrderCreateData {
  return {
    legacyId: BigInt(row.id),
    consecutiveNumber: row.consecutive_number ?? `LEGACY-O-${row.id}`,
    status: mapOrderStatus(row.state),
    legacyStatus: row.state,
    clientId: clientV2Id,
    plantId: plantV2Id,
    supervisorId,
    partNumber: row.first_part_number,
    partName: row.first_part_name,
    serviceType: row.service_type_name,
    syncedAt: new Date(),
  };
}

// Quotation status in legacy is a free-form string (no state machine). 6 known
// values. v2 doesn't act on quotation.status, so pass through as-is.
export function transformQuotation(
  row: LegacyQuotationRow,
  orderV2Id: number
): QuotationCreateData {
  return {
    legacyId: BigInt(row.id),
    consecutiveNumber: row.consecutive_number ?? `LEGACY-Q-${row.id}`,
    status: row.status ?? 'cotizacion_pendiente',
    orderId: orderV2Id,
    subtotal: row.subtotal ?? '0',
    total: row.total ?? '0',
    syncedAt: new Date(),
  };
}

// Inbound push de SYSQB: el reporte se crea recien en el legacy y debe entrar
// a v2 SIN datos de captura (totals=0, csv_table=null) y con status='pending'
// para que el supervisor pueda asignarlo a una tablet y el inspector lo capture.
// source='v2' porque a partir de aqui el reporte vive en el flujo v2 normal
// (assign → captura → muestreo → firma → publicacion).
export function transformDailyReportInbound(
  row: LegacyDailyReportRow,
  orderV2Id: number,
  quotationV2Id: number | null
): DailyReportCreateData {
  return {
    legacyId: BigInt(row.id),
    consecutiveNumber: row.consecutive_number ?? `INBOUND-DR-${row.id}`,
    orderId: orderV2Id,
    quotationId: quotationV2Id,
    reportDate: row.created_at,
    status: 'pending',
    publishedAt: null,
    signedAt: null,
    totalInspected: '0',
    totalOk: '0',
    totalNg: '0',
    totalScrap: '0',
    totalRecovered: '0',
    observations: row.observations,
    legacyCsvTable: null,
    legacyStatus: null,
    source: 'v2',
    syncedAt: new Date(),
  };
}

// All legacy daily_reports enter v2 as 'published' (historical). The supervisor
// reviews them as cards without going through sampling/sign/publish in v2.
// publishedAt = legacy.updated_at (when the legacy record was last touched).
export function transformDailyReport(
  row: LegacyDailyReportRow,
  orderV2Id: number,
  quotationV2Id: number | null
): DailyReportCreateData {
  return {
    legacyId: BigInt(row.id),
    consecutiveNumber: row.consecutive_number ?? `LEGACY-DR-${row.id}`,
    orderId: orderV2Id,
    quotationId: quotationV2Id,
    reportDate: row.created_at,
    status: 'published',
    publishedAt: row.updated_at,
    signedAt: null,
    totalInspected: row.total_inspected ?? '0',
    totalOk: row.total_ok ?? '0',
    totalNg: row.total_ng ?? '0',
    totalScrap: row.total_scrap ?? '0',
    totalRecovered: row.total_recovered ?? '0',
    observations: row.observations,
    legacyCsvTable: row.csv_table,
    legacyStatus: row.quotation_status ?? row.order_status,
    source: 'legacy',
    syncedAt: new Date(),
  };
}
