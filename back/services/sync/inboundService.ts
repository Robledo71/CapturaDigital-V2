import 'server-only'

import { prisma } from '@/back/db/prisma'
import type { InboundPayload } from '@/back/validators/inboundSchemas'
import {
  transformClient,
  transformPlant,
  transformOrder,
  transformQuotation,
  transformDailyReportInbound,
} from './transformService'
import {
  upsertClient,
  upsertPlant,
  upsertOrder,
  upsertQuotation,
  upsertDailyReport,
  findClientV2IdByLegacyId,
  findPlantV2IdByLegacyId,
  findOrderV2IdByLegacyId,
  findQuotationV2IdByLegacyId,
} from './upsertService'
import { buildPlantToSupervisorMap, matchSupervisorByPlanta } from './supervisorMatchService'

export type InboundError =
  | 'CLIENT_NOT_FOUND'
  | 'PLANT_NOT_FOUND'
  | 'ORDER_NOT_FOUND'
  | 'MISSING_PARENT_ID'
  | 'INTERNAL_ERROR'

export type InboundResult =
  | { ok: true; type: InboundPayload['type']; v2Id: number; legacyId: string; supervisorId?: string | null }
  | { ok: false; error: InboundError; message: string }

export async function ingestInbound(payload: InboundPayload): Promise<InboundResult> {
  try {
    switch (payload.type) {
      case 'client': {
        const v2Id = await upsertClient(prisma, transformClient(toLegacyRow(payload.data)))
        return { ok: true, type: 'client', v2Id, legacyId: payload.data.id }
      }

      case 'plant': {
        const v2Id = await upsertPlant(prisma, transformPlant(toLegacyRow(payload.data)))
        return { ok: true, type: 'plant', v2Id, legacyId: payload.data.id }
      }

      case 'order': {
        const { client_id, plant_id } = payload.data
        if (!client_id || !plant_id) {
          return {
            ok: false,
            error: 'MISSING_PARENT_ID',
            message: 'Order requiere client_id y plant_id',
          }
        }

        const clientV2Id = await findClientV2IdByLegacyId(prisma, BigInt(client_id))
        if (clientV2Id === null) {
          return {
            ok: false,
            error: 'CLIENT_NOT_FOUND',
            message: `Client con legacyId=${client_id} no existe en v2. Ingesta el Client primero.`,
          }
        }

        const plantV2Id = await findPlantV2IdByLegacyId(prisma, BigInt(plant_id))
        if (plantV2Id === null) {
          return {
            ok: false,
            error: 'PLANT_NOT_FOUND',
            message: `Plant con legacyId=${plant_id} no existe en v2. Ingesta la Plant primero.`,
          }
        }

        const supervisorMap = await buildPlantToSupervisorMap(prisma)
        const supervisorId = matchSupervisorByPlanta(supervisorMap, payload.data.plant_name)

        const v2Id = await upsertOrder(
          prisma,
          transformOrder(toLegacyRow(payload.data), clientV2Id, plantV2Id, supervisorId),
        )
        return { ok: true, type: 'order', v2Id, legacyId: payload.data.id, supervisorId }
      }

      case 'quotation': {
        const { order_id } = payload.data
        if (!order_id) {
          return {
            ok: false,
            error: 'MISSING_PARENT_ID',
            message: 'Quotation requiere order_id',
          }
        }
        const orderV2Id = await findOrderV2IdByLegacyId(prisma, BigInt(order_id))
        if (orderV2Id === null) {
          return {
            ok: false,
            error: 'ORDER_NOT_FOUND',
            message: `Order con legacyId=${order_id} no existe en v2. Ingesta la Order primero.`,
          }
        }
        const v2Id = await upsertQuotation(prisma, transformQuotation(toLegacyRow(payload.data), orderV2Id))
        return { ok: true, type: 'quotation', v2Id, legacyId: payload.data.id }
      }

      case 'daily_report': {
        const { order_id, quotation_id } = payload.data
        if (!order_id) {
          return {
            ok: false,
            error: 'MISSING_PARENT_ID',
            message: 'DailyReport requiere order_id',
          }
        }

        // Si ya existe (por legacyId), no lo tocamos: el inspector o supervisor
        // pueden estar capturando datos y un re-push de SYSQB no debe pisarlos.
        // Idempotencia: el end-state queda igual entre primer y segundo push.
        const existing = await prisma.dailyReport.findUnique({
          where: { legacyId: BigInt(payload.data.id) },
          select: { id: true },
        })
        if (existing) {
          return { ok: true, type: 'daily_report', v2Id: existing.id, legacyId: payload.data.id }
        }

        const orderV2Id = await findOrderV2IdByLegacyId(prisma, BigInt(order_id))
        if (orderV2Id === null) {
          return {
            ok: false,
            error: 'ORDER_NOT_FOUND',
            message: `Order con legacyId=${order_id} no existe en v2. Ingesta la Order primero.`,
          }
        }
        const quotationV2Id = quotation_id
          ? await findQuotationV2IdByLegacyId(prisma, BigInt(quotation_id))
          : null

        const v2Id = await upsertDailyReport(
          prisma,
          transformDailyReportInbound(toLegacyRow(payload.data), orderV2Id, quotationV2Id),
        )
        return { ok: true, type: 'daily_report', v2Id, legacyId: payload.data.id }
      }
    }
  } catch (error) {
    console.error('[inbound] ingestion error:', error)
    return {
      ok: false,
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'unknown error',
    }
  }
}

// Zod parses ids and dates with strict types; transformService funcs expect the
// raw legacy row shape (id as string from pg, dates as Date). Cast is safe — shape matches.
function toLegacyRow<T>(data: T): T {
  return data
}
