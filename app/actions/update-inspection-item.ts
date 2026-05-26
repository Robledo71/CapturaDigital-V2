'use server'
// TODO Fase 3: InspectionItem model eliminado del esquema. Action stubbeada.

export type IncidentInput = { description: string; count: number }

export type UpdateInspectionItemState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined

export async function updateInspectionItemAction(
  _state: UpdateInspectionItemState,
  _formData: FormData,
): Promise<UpdateInspectionItemState> {
  return { ok: false, error: 'Pendiente Fase 3' }
}
