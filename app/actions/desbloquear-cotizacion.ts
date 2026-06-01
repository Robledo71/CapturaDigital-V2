'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/back/services/session'

export type DesbloquearCotizacionState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined

export async function desbloquearCotizacionAction(
  _state: DesbloquearCotizacionState,
  formData: FormData,
): Promise<DesbloquearCotizacionState> {
  const session = await getSession()
  if (!session || !['admin', 'supervisor', 'capturacion'].includes(session.rol)) {
    return { ok: false, error: 'Sesión expirada o permisos insuficientes.' }
  }

  const id = parseInt(String(formData.get('cotizacionId') ?? ''), 10)
  if (isNaN(id)) return { ok: false, error: 'ID inválido.' }

  const desbloqueado = formData.get('desbloqueado') === 'true'

  let res: Response
  try {
    res = await fetch(
      `${process.env.QSYNC_API_URL}/qb_sync/quotations/${id}/desbloqueado`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Token': process.env.X_APP_TOKEN ?? '',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ desbloqueado }),
      },
    )
  } catch {
    return { ok: false, error: 'No se pudo conectar con el servidor.' }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { ok: false, error: (body as { message?: string }).message ?? 'Error al actualizar.' }
  }

  revalidatePath('/capturacion/desbloquear')
  return { ok: true }
}
