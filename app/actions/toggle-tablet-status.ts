'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'

export type ToggleTabletStatusState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined

export async function toggleTabletStatusAction(
  _state: ToggleTabletStatusState,
  formData: FormData,
): Promise<ToggleTabletStatusState> {
  const session = await getSession()
  if (!session || !can(session, 'tablets.gestionar')) {
    return { ok: false, error: 'No autorizado.' }
  }

  const codigoTablet = String(formData.get('codigoTablet') ?? '').trim()
  const status = String(formData.get('status') ?? '').trim()

  if (!codigoTablet) return { ok: false, error: 'Código de tablet inválido.' }
  if (!['activa', 'inactiva', 'en_mantenimiento'].includes(status)) {
    return { ok: false, error: 'Estado inválido.' }
  }

  const BASE = process.env.QSYNC_API_URL ?? 'http://localhost:3001'

  let res: Response
  try {
    res = await fetch(`${BASE}/qb_sync/tablets/${codigoTablet}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Token': process.env.X_APP_TOKEN ?? '',
        'Authorization': `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ status }),
    })
  } catch {
    return { ok: false, error: 'No se pudo conectar con el servidor.' }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { ok: false, error: (body as { message?: string }).message ?? 'Error al actualizar la tablet.' }
  }

  revalidatePath('/admin/tablets')
  return { ok: true }
}
