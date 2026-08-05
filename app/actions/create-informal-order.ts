'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { createInformalOrder } from '@/back/services/informalOrdersService'

export type CreateInformalOrderState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined

const CreateInformalOrderSchema = z.object({
  tipo_orden: z.enum(['OV', 'OA']),
  cliente_id: z.number().int().positive('Selecciona un cliente.'),
  numero_parte: z.string().min(1, 'El número de parte es requerido').trim(),
  nombre_parte: z.string().trim().optional(),
  planta_id: z.number().int().positive('Selecciona una planta.'),
})

const REVALIDATE_PATHS = [
  '/supervisor/ordenes-informales',
  '/superusuario/ordenes-informales',
  '/servicio-cliente/ordenes-informales',
  '/capturacion/ordenes-informales',
]

export async function crearOrdenInformalAction(
  _state: CreateInformalOrderState,
  formData: FormData,
): Promise<CreateInformalOrderState> {
  const session = await getSession()
  if (!session) {
    return { ok: false, error: 'Sesión expirada. Por favor inicia sesión nuevamente.' }
  }
  if (!can(session, 'ordenes_informales.crear')) {
    return { ok: false, error: 'No autorizado.' }
  }

  const clienteIdRaw = Number(formData.get('cliente_id'))
  const plantaIdRaw = Number(formData.get('planta_id'))
  const nombreParteRaw = String(formData.get('nombre_parte') ?? '').trim()

  // Números de parte: lista dinámica (uno o varios). Se unen con ' / ' →
  // "np1 / np2 / np3"; el backend divide por '/' cuando corresponde.
  const numerosParte = formData.getAll('numero_parte').map((v) => String(v).trim()).filter(Boolean)
  const numeroParteJoined = numerosParte.join(' / ')

  const raw = {
    tipo_orden: String(formData.get('tipo_orden') ?? ''),
    cliente_id: Number.isFinite(clienteIdRaw) ? clienteIdRaw : NaN,
    numero_parte: numeroParteJoined,
    nombre_parte: nombreParteRaw || undefined,
    planta_id: Number.isFinite(plantaIdRaw) ? plantaIdRaw : NaN,
  }

  const validated = CreateInformalOrderSchema.safeParse(raw)
  if (!validated.success) {
    const firstIssue = validated.error.issues[0]
    return { ok: false, error: firstIssue?.message ?? 'Datos inválidos.' }
  }

  const inspectorIds = formData.getAll('inspectorIds').map(String).filter(Boolean)

  const incidencias = formData.getAll('incidencias').map((v) => String(v).trim()).filter(Boolean)
  const incidentes = incidencias.join(', ')

  let inspectionSession: { idSupervisor: string; idInspectores: string[] } | undefined
  if (inspectorIds.length > 0) {
    if (!session.empleadoId) {
      return { ok: false, error: 'Tu usuario no tiene empleado asociado.' }
    }
    inspectionSession = {
      idSupervisor: String(session.empleadoId),
      idInspectores: inspectorIds,
    }
  }

  try {
    const result = await createInformalOrder(
      {
        tipoOrden: validated.data.tipo_orden,
        clienteId: validated.data.cliente_id,
        item: {
          numeroParte: validated.data.numero_parte,
          nombreParte: validated.data.nombre_parte,
          plantaId: validated.data.planta_id,
          incidentes: incidentes || undefined,
        },
        ...(inspectionSession ? { inspectionSession } : {}),
      },
      session.accessToken,
    )

    if (!result.ok) {
      return { ok: false, error: result.error }
    }

    for (const path of REVALIDATE_PATHS) {
      revalidatePath(path)
    }

    return { ok: true }
  } catch {
    return { ok: false, error: 'Error inesperado al crear la orden informal.' }
  }
}
