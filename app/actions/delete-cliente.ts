'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/back/services/session'
import { deleteCliente } from '@/back/services/clientService'

export type DeleteClienteState = { ok?: true; error?: string } | undefined

export async function deleteClienteAction(
  _state: DeleteClienteState,
  formData: FormData,
): Promise<DeleteClienteState> {
  const session = await getSession()
  if (!session || session.rol !== 'admin') {
    return { error: 'No autorizado' }
  }

  const id = parseInt(String(formData.get('id') ?? ''), 10)
  if (isNaN(id)) {
    return { error: 'ID de cliente inválido' }
  }

  const result = await deleteCliente(id, session.accessToken)

  if (!result.ok) {
    if (result.reason === 'not_found') {
      return { error: 'Cliente no encontrado' }
    }
    return { error: 'Error inesperado al eliminar el cliente' }
  }

  revalidatePath('/admin/clientes')
  return { ok: true }
}
