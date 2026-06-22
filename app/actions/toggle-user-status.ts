'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'

export type ToggleUserStatusState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined

export async function toggleUserStatusAction(
  _state: ToggleUserStatusState,
  formData: FormData,
): Promise<ToggleUserStatusState> {
  const session = await getSession()
  if (!session || !can(session, 'usuarios.crud')) {
    return { ok: false, error: 'No autorizado.' }
  }

  const codigoEmpleado = String(formData.get('codigoEmpleado') ?? '').trim()
  const isActive = formData.get('isActive') === 'true'

  if (!codigoEmpleado) return { ok: false, error: 'Código de empleado inválido.' }

  const BASE = (process.env.QSYNC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '')

  let res: Response
  try {
    res = await fetch(`${BASE}/qb_sync/users/${encodeURIComponent(codigoEmpleado)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Token': process.env.X_APP_TOKEN ?? '',
        'Authorization': `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ is_active: isActive }),
    })
  } catch {
    return { ok: false, error: 'No se pudo conectar con el servidor.' }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return {
      ok: false,
      error: (body as { message?: string }).message ?? 'Error al actualizar el usuario.',
    }
  }

  revalidatePath('/admin/usuarios')
  return { ok: true }
}
