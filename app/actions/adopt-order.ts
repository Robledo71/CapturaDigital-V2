'use server'
// TODO Fase 2: supervisorId eliminado de Order. Action stubbeada.

export type AdoptOrderState = {
  ok?: true
  error?: string
}

export async function adoptOrderAction(
  _state: AdoptOrderState,
  _formData: FormData,
): Promise<AdoptOrderState> {
  return { error: 'Pendiente Fase 2' }
}
