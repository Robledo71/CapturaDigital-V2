'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/back/services/session'
import {
  publishReporte,
  registerSamplingDecision,
  signReporte,
} from '@/back/services/reporteDetalleService'

export type WorkflowActionState = {
  ok?: true
  error?: string
}

function getReportePath(consecutiveNumber: string) {
  return `/supervisor/reportes/${encodeURIComponent(consecutiveNumber)}`
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

export async function registerSamplingAction(
  _state: WorkflowActionState,
  formData: FormData,
): Promise<WorkflowActionState> {
  const session = await getSession()
  if (!session || session.rol !== 'supervisor') {
    return { error: 'No autorizado' }
  }

  const consecutiveNumber = String(formData.get('consecutiveNumber') ?? '').trim()
  const decision = String(formData.get('decision') ?? '')
  const notes = String(formData.get('notes') ?? '').trim()

  if (!consecutiveNumber) return { error: 'Reporte requerido' }
  if (decision !== 'approve' && decision !== 'reject') {
    return { error: 'Decisión de muestreo inválida' }
  }

  const result = await registerSamplingDecision({
    consecutiveNumber,
    supervisorId: String(session.userId),
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
  revalidatePath('/supervisor/reportes')
  revalidatePath(getReportePath(consecutiveNumber))

  return { ok: true }
}

export async function signReporteAction(
  _state: WorkflowActionState,
  formData: FormData,
): Promise<WorkflowActionState> {
  const session = await getSession()
  if (!session || session.rol !== 'supervisor') {
    return { error: 'No autorizado' }
  }

  const consecutiveNumber = String(formData.get('consecutiveNumber') ?? '').trim()
  if (!consecutiveNumber) return { error: 'Reporte requerido' }

  const result = await signReporte(consecutiveNumber, String(session.userId))

  if (!result.ok) {
    return {
      error:
        result.reason === 'not_found'
          ? 'Reporte no encontrado'
          : 'Primero aprueba el muestreo para poder firmar',
    }
  }

  revalidatePath('/supervisor')
  revalidatePath('/supervisor/reportes')
  revalidatePath(getReportePath(consecutiveNumber))

  return { ok: true }
}

export async function publishReporteAction(
  _state: WorkflowActionState,
  formData: FormData,
): Promise<WorkflowActionState> {
  const session = await getSession()
  if (!session || session.rol !== 'supervisor') {
    return { error: 'No autorizado' }
  }

  const consecutiveNumber = String(formData.get('consecutiveNumber') ?? '').trim()
  if (!consecutiveNumber) return { error: 'Reporte requerido' }

  const result = await publishReporte(consecutiveNumber, String(session.userId))

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
  revalidatePath(getReportePath(consecutiveNumber))

  return { ok: true }
}
