'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import {
  registerInformalSamplingDecision,
  signInformalReporte,
} from '@/back/services/informalReportesService'

export type WorkflowActionState = {
  ok?: true
  error?: string
}

const REVALIDATE_PATHS = [
  '/supervisor/reportes-informales',
  '/superusuario/reportes-informales',
  '/servicio-cliente/reportes-informales',
  '/capturacion/reportes-informales',
]

function getReportePaths(reportId: number) {
  return REVALIDATE_PATHS.map((base) => `${base}/${reportId}`)
}

function parseDefects(formData: FormData): Record<number, number> {
  const defects: Record<number, number> = {}

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith('defects_')) continue

    const itemId = Number(key.replace('defects_', ''))
    if (!Number.isInteger(itemId)) continue

    defects[itemId] = Math.max(0, Math.floor(Number(value) || 0))
  }

  return defects
}

export async function registerInformalSamplingAction(
  _state: WorkflowActionState,
  formData: FormData,
): Promise<WorkflowActionState> {
  const session = await getSession()
  if (!session || !can(session, 'reportes_informales.muestreo')) {
    return { error: 'No autorizado' }
  }

  const reportId = parseInt(String(formData.get('reportId') ?? ''), 10)
  if (isNaN(reportId)) return { error: 'Reporte requerido' }

  const decision = String(formData.get('decision') ?? '')
  const notes = String(formData.get('notes') ?? '').trim()

  if (decision !== 'approve' && decision !== 'reject') {
    return { error: 'Decisión de muestreo inválida' }
  }

  const result = await registerInformalSamplingDecision({
    reportId,
    accessToken: session.accessToken,
    decision,
    defectsByItem: parseDefects(formData),
    notes,
  })

  if (!result.ok) {
    const errors: Record<typeof result.reason, string> = {
      not_found: 'Reporte no encontrado',
      invalid_status: 'El reporte no está listo para muestreo',
      no_sampling_items: 'No hay piezas inspeccionadas con rango de muestreo válido',
      rule_failed: 'El muestreo no cumple la regla AQL. Reenvíalo al inspector.',
      notes_required: 'Agrega un motivo para reenviar al inspector',
    }

    return { error: errors[result.reason] }
  }

  revalidatePath('/supervisor')
  for (const path of [...REVALIDATE_PATHS, ...getReportePaths(reportId)]) {
    revalidatePath(path)
  }

  return { ok: true }
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
    return {
      error:
        result.reason === 'not_found'
          ? 'Reporte no encontrado'
          : 'Primero aprueba el muestreo para poder firmar',
    }
  }

  revalidatePath('/supervisor')
  for (const path of [...REVALIDATE_PATHS, ...getReportePaths(reportId)]) {
    revalidatePath(path)
  }

  return { ok: true }
}
