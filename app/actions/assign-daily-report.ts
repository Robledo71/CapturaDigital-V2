'use server'
// TODO Fase 2: DailyReport schema cambió — tabletId eliminado. Action stubbeada.

export type AssignDailyReportState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined

export async function assignDailyReportAction(
  _state: AssignDailyReportState,
  _formData: FormData,
): Promise<AssignDailyReportState> {
  return { ok: false, error: 'Pendiente Fase 2' }
}
