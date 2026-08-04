'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import {
  publishReporte,
  registerSamplingDetalle,
  signReporte,
} from '@/back/services/reporteDetalleService'

export type WorkflowActionState = {
  ok?: true
  error?: string
}

export type MuestreoDetalleState =
  | { ok: true; approved: boolean; itemId: number; message: string }
  | { ok: false; error: string }
  | Record<string, never>

function getReportePath(reportId: number) {
  return `/supervisor/reportes/${reportId}`
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

export async function registrarMuestreoDetalleAction(
  _prevState: MuestreoDetalleState,
  formData: FormData,
): Promise<MuestreoDetalleState> {
  const session = await getSession()
  if (!session || !can(session, 'reportes.muestreo')) {
    return { ok: false, error: 'No autorizado' }
  }

  const reportId = parseInt(String(formData.get('reportId') ?? ''), 10)
  const itemId = parseInt(String(formData.get('item_id') ?? ''), 10)
  const defects = Math.max(0, Math.floor(Number(formData.get('defects')) || 0))
  const observations = String(formData.get('observations') ?? '').trim() || null

  if (isNaN(reportId) || isNaN(itemId)) {
    return { ok: false, error: 'Reporte o ítem inválido' }
  }

  const result = await registerSamplingDetalle({
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
  revalidatePath('/supervisor/reportes')
  revalidatePath(getReportePath(reportId))

  return {
    ok: true,
    approved: result.approved,
    itemId,
    message: result.approved ? 'Muestreo aprobado' : 'Muestreo NO aprobado',
  }
}

export async function signReporteAction(
  _state: WorkflowActionState,
  formData: FormData,
): Promise<WorkflowActionState> {
  const session = await getSession()
  if (!session || !can(session, 'reportes.firmar')) {
    return { error: 'No autorizado' }
  }

  const reportId = parseInt(String(formData.get('reportId') ?? ''), 10)
  if (isNaN(reportId)) return { error: 'Reporte requerido' }

  const result = await signReporte(reportId, session.accessToken)

  if (!result.ok) {
    if (result.reason === 'not_found') return { error: 'Reporte no encontrado' }
    if (result.reason === 'no_signature') {
      return { error: 'Configura tu firma en Configuración › Mi firma para poder firmar.' }
    }
    return { error: 'Primero aprueba el muestreo para poder firmar' }
  }

  revalidatePath('/supervisor')
  revalidatePath('/supervisor/reportes')
  revalidatePath(getReportePath(reportId))

  return { ok: true }
}

export async function publishReporteAction(
  _state: WorkflowActionState,
  formData: FormData,
): Promise<WorkflowActionState> {
  const session = await getSession()
  if (!session || !can(session, 'reportes.publicar')) {
    return { error: 'No autorizado' }
  }

  const reportId = parseInt(String(formData.get('reportId') ?? ''), 10)
  if (isNaN(reportId)) return { error: 'Reporte requerido' }

  const result = await publishReporte(reportId, session.accessToken)

  if (!result.ok) {
    return {
      error:
        result.reason === 'not_found'
          ? 'Reporte no encontrado'
          : 'Primero firma el reporte para poder publicarlo',
    }
  }

  revalidatePath('/supervisor')
  revalidatePath('/supervisor/reportes')
  revalidatePath(getReportePath(reportId))

  return { ok: true }
}
