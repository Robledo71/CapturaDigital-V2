'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'

export type BloquearTodasState =
  | { ok: true; count: number }
  | { ok: false; error: string }
  | undefined

export async function bloquearTodasCotizacionesAction(
  _state: BloquearTodasState,
  _formData: FormData,
): Promise<BloquearTodasState> {
  const session = await getSession()
  if (!session) {
    return { ok: false, error: 'Sesión expirada o permisos insuficientes.' }
  }

  if (!can(session, 'cotizaciones.bloquear')) {
    return { ok: false, error: 'Sesión expirada o permisos insuficientes.' }
  }

  let res: Response
  try {
    res = await fetch(
      `${process.env.QSYNC_API_URL}/qb_sync/quotations/bloquear-todas`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Token': process.env.X_APP_TOKEN ?? '',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({}),
      },
    )
  } catch {
    return { ok: false, error: 'No se pudo conectar con el servidor.' }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { ok: false, error: (body as { message?: string }).message ?? 'Error al bloquear.' }
  }

  const data = await res.json().catch(() => ({})) as { success?: boolean; data?: { count?: number } }
  const count = data?.data?.count ?? 0

  revalidatePath('/capturacion/desbloquear')
  revalidatePath('/servicio-cliente/desbloquear')

  return { ok: true, count }
}
