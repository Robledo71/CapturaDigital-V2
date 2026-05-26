'use server'

import { z } from 'zod'
import { importCotizacionesByOrden } from '@/back/services/qb-sync'

const Schema = z.object({
  orden: z.string().min(1, 'El número de orden es requerido').trim(),
})

export type ImportCotizacionState =
  | { ok: true; cotizaciones: number; items: number; orden: string }
  | { ok: false; error: string }
  | undefined

const ERROR_MESSAGES: Record<string, string> = {
  not_found: 'Orden no encontrada en QB.',
  auth: 'Error de autenticación con QB. Contacta al administrador.',
  rate_limit: 'Límite de peticiones QB alcanzado. Intenta en 15 minutos.',
  validation: 'Número de orden inválido.',
  server: 'Error del servidor QB. Intenta nuevamente.',
  network: 'Sin conexión con QB. Revisa tu red.',
}

export async function importCotizacionAction(
  _state: ImportCotizacionState,
  formData: FormData,
): Promise<ImportCotizacionState> {
  const raw = { orden: formData.get('orden') as string }
  const validated = Schema.safeParse(raw)
  if (!validated.success) {
    return { ok: false, error: validated.error.flatten().fieldErrors.orden?.[0] ?? 'Datos inválidos.' }
  }

  const result = await importCotizacionesByOrden(validated.data.orden)

  if (!result.ok) {
    return { ok: false, error: ERROR_MESSAGES[result.error] ?? 'Error al importar la orden.' }
  }

  return {
    ok: true,
    cotizaciones: result.cotizacionesImported,
    items: result.itemsImported,
    orden: validated.data.orden,
  }
}
