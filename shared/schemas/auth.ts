import { z } from 'zod'

export const TabletLoginSchema = z.object({
  identifier: z.string().min(1, 'El usuario o número de empleado es requerido').trim(),
  password: z.string().min(1, 'La contraseña es requerida'),
})

export type TabletLoginInput = z.infer<typeof TabletLoginSchema>
