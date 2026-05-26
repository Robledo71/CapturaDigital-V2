import { z } from 'zod'

export const tabletLoginSchema = z.object({
  codigoTablet: z
    .string()
    .min(1, 'codigoTablet requerido')
    .max(64, 'codigoTablet demasiado largo')
    .trim(),
})

export const iniciarItemSchema = z.object({
  operadores: z.string().min(1, 'operadores requerido').max(500),
  shift: z.number().int().min(1).max(3).optional(),
  reportDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'reportDate debe ser YYYY-MM-DD'),
})

const inspectionItemInputSchema = z.object({
  description: z.string().max(500).optional(),
  inspected: z.number().nonnegative(),
  ok: z.number().nonnegative(),
  ng: z.number().nonnegative(),
  scrap: z.number().nonnegative(),
  recovered: z.number().nonnegative(),
  lote: z.string().max(100).optional(),
  series: z.string().max(100).optional(),
  otro: z.string().max(500).optional(),
  incidents: z.record(z.string(), z.unknown()).optional(),
})

export const submitItemsSchema = z.object({
  items: z
    .array(inspectionItemInputSchema)
    .min(1, 'Se requiere al menos un item')
    .max(100, 'Máximo 100 items por request'),
})

export type TabletLoginInput   = z.infer<typeof tabletLoginSchema>
export type IniciarItemInput   = z.infer<typeof iniciarItemSchema>
export type SubmitItemsInput   = z.infer<typeof submitItemsSchema>
