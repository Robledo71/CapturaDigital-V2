'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import {
  registerSamplingDetalleInformal,
  signInformalReporte,
} from '@/back/services/informalReportesService'

export type WorkflowActionState = {
  ok?: true
  error?: string
}

export type MuestreoDetalleState =
  | { ok: true; approved: boolean; itemId: number; message: string }
  | { ok: false; error: string }
  | Record<string, never>

const REVALIDATE_PATHS = [
  '/supervisor/reportes-informales',
  '/superusuario/reportes-informales',
  '/servicio-cliente/reportes-informales',
  '/capturacion/reportes-informales',
]

function getReportePaths(reportId: number) {
  return REVALIDATE_PATHS.map((base) => `${base}/${reportId}`)
}

const MUESTREO_DETALLE_ERRORS: Record<
  'not_found' | 'invalid_status' | 'no_sampling_items' | 'item_not_found' | 'error',
  string
> = {
  not_found: 'Reporte no encontrado.',
  invalid_status: 'El reporte no está en un estado válido para muestreo.',
  no_sampling_items: 'Este detalle no requiere muestreo.',
  item_not_found: 'El detalle no pertenece al reporte.',
  error: 'No se pudo registrar el muestreo.',
}

export async function registrarMuestreoDetalleInformalAction(
  _prevState: MuestreoDetalleState,
  formData: FormData,
): Promise<MuestreoDetalleState> {
  const session = await getSession()
  if (!session || !can(session, 'reportes_informales.muestreo')) {
    return { ok: false, error: 'No autorizado' }
  }

  const reportId = parseInt(String(formData.get('reportId') ?? ''), 10)
  const itemId = parseInt(String(formData.get('item_id') ?? ''), 10)
  const defects = Math.max(0, Math.floor(Number(formData.get('defects')) || 0))
  const observations = String(formData.get('observations') ?? '').trim() || null

  if (isNaN(reportId) || isNaN(itemId)) {
    return { ok: false, error: 'Reporte o ítem inválido' }
  }

  const result = await registerSamplingDetalleInformal({
    reportId,
    itemId,
    defects,
    observations,
    accessToken: session.accessToken,
  })

  if (!result.ok) {
    return { ok: false, error: MUESTREO_DETALLE_ERRORS[result.reason] }
  }

  revalidatePath('/supervisor')
  for (const path of [...REVALIDATE_PATHS, ...getReportePaths(reportId)]) {
    revalidatePath(path)
  }

  return {
    ok: true,
    approved: result.approved,
    itemId,
    message: result.approved ? 'Muestreo aprobado' : 'Muestreo NO aprobado',
  }
}

export async function signInformalReporteAction(
  _state: WorkflowActionState,
  formData: FormData,
): Promise<WorkflowActionState> {
  const session = await getSession()
  if (!session || !can(session, 'reportes_informales.firmar')) {
    return { error: 'No autorizado' }
  }

  const reportId = parseInt(String(formData.get('reportId') ?? ''), 10)
  if (isNaN(reportId)) return { error: 'Reporte requerido' }

  const result = await signInformalReporte(reportId, session.accessToken)

  if (!result.ok) {
    if (result.reason === 'not_found') return { error: 'Reporte no encontrado' }
    if (result.reason === 'no_signature') {
      return { error: 'Configura tu firma en Configuración › Mi firma para poder firmar.' }
    }
    return { error: 'Primero aprueba el muestreo para poder firmar' }
  }

  revalidatePath('/supervisor')
  for (const path of [...REVALIDATE_PATHS, ...getReportePaths(reportId)]) {
    revalidatePath(path)
  }

  return { ok: true }
}
