// TODO Fase 4: sync deshabilitado — Client, SyncState, SyncRun eliminados del esquema.
// DailyReport schema completamente cambiado. Todas las funciones stubbeadas.

import type {
  ClientCreateData,
  DailyReportCreateData,
  OrderCreateData,
  PlantCreateData,
  QuotationCreateData,
} from './transformService'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function upsertClient(_prisma: any, _data: ClientCreateData): Promise<number> {
  return 0
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function upsertPlant(_prisma: any, _data: PlantCreateData): Promise<number> {
  return 0
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function upsertOrder(_prisma: any, _data: OrderCreateData): Promise<number> {
  return 0
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function upsertQuotation(_prisma: any, _data: QuotationCreateData): Promise<number> {
  return 0
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function upsertDailyReport(_prisma: any, _data: DailyReportCreateData): Promise<number> {
  return 0
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function findClientV2IdByLegacyId(_prisma: any, _legacyId: bigint): Promise<number | null> {
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function findPlantV2IdByLegacyId(_prisma: any, _legacyId: bigint): Promise<number | null> {
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function findOrderV2IdByLegacyId(_prisma: any, _legacyId: bigint): Promise<number | null> {
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function findQuotationV2IdByLegacyId(_prisma: any, _legacyId: bigint): Promise<number | null> {
  return null
}
