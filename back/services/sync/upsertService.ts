import type { PrismaClient } from '@prisma/client';
import type {
  ClientCreateData,
  DailyReportCreateData,
  OrderCreateData,
  PlantCreateData,
  QuotationCreateData,
} from './transformService';

// Idempotent upserts keyed by legacyId. The "create" branch inserts everything;
// the "update" branch overwrites only fields that legacy is the source of truth
// for. v2-managed fields (DailyReport.status when in active flow, signedAt,
// sampleSize, etc.) are not touched on update.
//
// For legacy reports this distinction is mostly moot — they come in as
// status='published' and don't go through v2's sampling/signing flow — but the
// pattern protects us if a v2 user manually changes something on a legacy row.

export async function upsertClient(
  prisma: PrismaClient,
  data: ClientCreateData
): Promise<number> {
  const row = await prisma.client.upsert({
    where: { legacyId: data.legacyId },
    create: {
      legacyId: data.legacyId,
      name: data.name,
      address: data.address,
      requirePurchaseOrder: data.requirePurchaseOrder,
      syncedAt: data.syncedAt,
    },
    update: {
      name: data.name,
      address: data.address,
      requirePurchaseOrder: data.requirePurchaseOrder,
      syncedAt: data.syncedAt,
    },
    select: { id: true },
  });
  return row.id;
}

export async function upsertPlant(
  prisma: PrismaClient,
  data: PlantCreateData
): Promise<number> {
  const row = await prisma.plant.upsert({
    where: { legacyId: data.legacyId },
    create: {
      legacyId: data.legacyId,
      name: data.name,
      address: data.address,
      syncedAt: data.syncedAt,
    },
    update: {
      name: data.name,
      address: data.address,
      syncedAt: data.syncedAt,
    },
    select: { id: true },
  });
  return row.id;
}

export async function upsertOrder(
  prisma: PrismaClient,
  data: OrderCreateData
): Promise<number> {
  const row = await prisma.order.upsert({
    where: { legacyId: data.legacyId },
    create: {
      legacyId: data.legacyId,
      consecutiveNumber: data.consecutiveNumber,
      status: data.status,
      legacyStatus: data.legacyStatus,
      clientId: data.clientId,
      plantId: data.plantId,
      supervisorId: data.supervisorId,
      partNumber: data.partNumber,
      partName: data.partName,
      serviceType: data.serviceType,
      syncedAt: data.syncedAt,
    },
    update: {
      status: data.status,
      legacyStatus: data.legacyStatus,
      clientId: data.clientId,
      plantId: data.plantId,
      partNumber: data.partNumber,
      partName: data.partName,
      serviceType: data.serviceType,
      syncedAt: data.syncedAt,
      // Intentionally NOT updating supervisorId on subsequent syncs — once a
      // v2 supervisor "adopts" a legacy order, the sync must not unassign it.
    },
    select: { id: true },
  });
  return row.id;
}

export async function upsertQuotation(
  prisma: PrismaClient,
  data: QuotationCreateData
): Promise<number> {
  const row = await prisma.quotation.upsert({
    where: { legacyId: data.legacyId },
    create: {
      legacyId: data.legacyId,
      consecutiveNumber: data.consecutiveNumber,
      status: data.status,
      orderId: data.orderId,
      subtotal: data.subtotal,
      total: data.total,
      syncedAt: data.syncedAt,
    },
    update: {
      status: data.status,
      subtotal: data.subtotal,
      total: data.total,
      syncedAt: data.syncedAt,
    },
    select: { id: true },
  });
  return row.id;
}

export async function upsertDailyReport(
  prisma: PrismaClient,
  data: DailyReportCreateData
): Promise<number> {
  const row = await prisma.dailyReport.upsert({
    where: { legacyId: data.legacyId },
    create: {
      legacyId: data.legacyId,
      consecutiveNumber: data.consecutiveNumber,
      orderId: data.orderId,
      quotationId: data.quotationId,
      reportDate: data.reportDate,
      status: data.status,
      publishedAt: data.publishedAt,
      signedAt: data.signedAt,
      totalInspected: data.totalInspected,
      totalOk: data.totalOk,
      totalNg: data.totalNg,
      totalScrap: data.totalScrap,
      totalRecovered: data.totalRecovered,
      observations: data.observations,
      legacyCsvTable: data.legacyCsvTable as never,
      legacyStatus: data.legacyStatus,
      source: data.source,
      syncedAt: data.syncedAt,
    },
    update: {
      totalInspected: data.totalInspected,
      totalOk: data.totalOk,
      totalNg: data.totalNg,
      totalScrap: data.totalScrap,
      totalRecovered: data.totalRecovered,
      observations: data.observations,
      legacyCsvTable: data.legacyCsvTable as never,
      legacyStatus: data.legacyStatus,
      syncedAt: data.syncedAt,
      // Intentionally NOT updating: status, publishedAt, signedAt, sampleSize,
      // sampleNg, sampleApproved, sampledAt. These are v2-managed once set.
    },
    select: { id: true },
  });
  return row.id;
}

// Lookups used by the orchestrator to resolve parent v2 ids when transforming
// children. Returns null if the parent hasn't been synced yet (caller skips
// the child and logs).

export async function findClientV2IdByLegacyId(
  prisma: PrismaClient,
  legacyId: bigint
): Promise<number | null> {
  const row = await prisma.client.findUnique({
    where: { legacyId },
    select: { id: true },
  });
  return row?.id ?? null;
}

export async function findPlantV2IdByLegacyId(
  prisma: PrismaClient,
  legacyId: bigint
): Promise<number | null> {
  const row = await prisma.plant.findUnique({
    where: { legacyId },
    select: { id: true },
  });
  return row?.id ?? null;
}

export async function findOrderV2IdByLegacyId(
  prisma: PrismaClient,
  legacyId: bigint
): Promise<number | null> {
  const row = await prisma.order.findUnique({
    where: { legacyId },
    select: { id: true },
  });
  return row?.id ?? null;
}

export async function findQuotationV2IdByLegacyId(
  prisma: PrismaClient,
  legacyId: bigint
): Promise<number | null> {
  const row = await prisma.quotation.findUnique({
    where: { legacyId },
    select: { id: true },
  });
  return row?.id ?? null;
}
