import { z } from 'zod'

const legacyIdString = z.string().regex(/^\d+$/, 'debe ser un entero positivo como string')
const nullableLegacyIdString = legacyIdString.nullable()

const clientDataSchema = z.object({
  id: legacyIdString,
  name: z.string().nullable(),
  address: z.string().nullable(),
  require_purchase_order: z.boolean().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
})

const plantDataSchema = z.object({
  id: legacyIdString,
  name: z.string().nullable(),
  address: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
})

const orderDataSchema = z.object({
  id: legacyIdString,
  consecutive_number: z.string().nullable(),
  state: z.string().nullable(),
  client_id: nullableLegacyIdString,
  plant_id: nullableLegacyIdString,
  service_type_name: z.string().nullable(),
  plant_name: z.string().nullable(),
  client_name: z.string().nullable(),
  first_part_number: z.string().nullable(),
  first_part_name: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
})

const quotationDataSchema = z.object({
  id: legacyIdString,
  consecutive_number: z.string().nullable(),
  status: z.string().nullable(),
  order_id: nullableLegacyIdString,
  subtotal: z.string().nullable(),
  total: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
})

const dailyReportDataSchema = z.object({
  id: legacyIdString,
  consecutive_number: z.string().nullable(),
  order_id: nullableLegacyIdString,
  quotation_id: nullableLegacyIdString,
  total_inspected: z.string().nullable(),
  total_ok: z.string().nullable(),
  total_ng: z.string().nullable(),
  total_recovered: z.string().nullable(),
  total_scrap: z.string().nullable(),
  observations: z.string().nullable(),
  csv_table: z.unknown(),
  order_status: z.string().nullable(),
  quotation_status: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
})

export const inboundPayloadSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('client'), data: clientDataSchema }),
  z.object({ type: z.literal('plant'), data: plantDataSchema }),
  z.object({ type: z.literal('order'), data: orderDataSchema }),
  z.object({ type: z.literal('quotation'), data: quotationDataSchema }),
  z.object({ type: z.literal('daily_report'), data: dailyReportDataSchema }),
])

export type InboundPayload = z.infer<typeof inboundPayloadSchema>
