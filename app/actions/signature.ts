'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/back/services/session'
import { canAny, type Permiso } from '@/front/lib/permisos'
import { deleteSignature } from '@/back/services/signatureService'

const SIGNER_PERMISOS: Permiso[] = ['reportes.firmar', 'reportes_informales.firmar']

// Rutas de configuración de firma en los 3 portales que la exponen — se
// revalidan todas porque no sabemos desde cuál se llamó la acción (el mismo
// componente cliente MiFirmaConfig se monta en las tres).
const CONFIGURACION_PATHS = [
  '/supervisor/configuracion',
  '/superusuario/configuracion',
  '/admin/configuracion',
]

export type SignatureActionState = { ok: true } | { ok: false; error: string } | undefined

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg'])
const MAX_SIZE = 5 * 1024 * 1024

export async function subirFirmaAction(
  _prevState: SignatureActionState,
  formData: FormData,
): Promise<SignatureActionState> {
  const session = await getSession()
  if (!session || !canAny(session, SIGNER_PERMISOS)) {
    return { ok: false, error: 'No autorizado' }
  }

  const file = formData.get('signature') as File | null
  if (!file || file.size === 0) {
    return { ok: false, error: 'No se seleccionó ninguna imagen' }
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: 'Solo se permiten imágenes PNG o JPG' }
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, error: 'La imagen excede el límite de 5 MB' }
  }

  const body = new FormData()
  body.append('signature', file)

  const res = await fetch(`${process.env.QSYNC_API_URL}/qb_sync/signatures`, {
    method: 'POST',
    headers: {
      'X-App-Token': process.env.X_APP_TOKEN ?? '',
      Authorization: `Bearer ${session.accessToken}`,
    },
    body,
  })

  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    return {
      ok: false,
      error: (json as { message?: string }).message ?? `Error ${res.status} al subir la firma`,
    }
  }

  for (const path of CONFIGURACION_PATHS) revalidatePath(path)

  return { ok: true }
}

export async function borrarFirmaAction(): Promise<SignatureActionState> {
  const session = await getSession()
  if (!session || !canAny(session, SIGNER_PERMISOS)) {
    return { ok: false, error: 'No autorizado' }
  }

  const ok = await deleteSignature(session.accessToken)
  if (!ok) {
    return { ok: false, error: 'No se pudo eliminar la firma' }
  }

  for (const path of CONFIGURACION_PATHS) revalidatePath(path)

  return { ok: true }
}
