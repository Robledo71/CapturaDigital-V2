import 'server-only'

export type SignatureStatus = {
  hasSignature: boolean
}

function apiHeaders(accessToken: string): Record<string, string> {
  return {
    'X-App-Token': process.env.X_APP_TOKEN ?? '',
    Authorization: `Bearer ${accessToken}`,
  }
}

/**
 * Consulta si el usuario autenticado tiene una firma configurada.
 * Ante cualquier respuesta no-ok (401/403/500/etc.) se asume "sin firma" — el
 * caller (gate del botón "Firmar reporte" / sección de configuración) siempre
 * debe tratar un fallo de red como "no puede firmar" en vez de reventar la
 * página del reporte.
 */
export async function getSignatureStatus(accessToken: string): Promise<SignatureStatus> {
  try {
    const res = await fetch(`${process.env.QSYNC_API_URL}/qb_sync/signatures/me/status`, {
      headers: apiHeaders(accessToken),
      cache: 'no-store',
    })

    if (!res.ok) return { hasSignature: false }

    const body = await res.json().catch(() => null)
    return { hasSignature: Boolean(body?.data?.hasSignature) }
  } catch {
    return { hasSignature: false }
  }
}

/** Borra la firma del usuario autenticado. `true` si qb_sync confirmó el borrado. */
export async function deleteSignature(accessToken: string): Promise<boolean> {
  const res = await fetch(`${process.env.QSYNC_API_URL}/qb_sync/signatures`, {
    method: 'DELETE',
    headers: apiHeaders(accessToken),
  })

  return res.ok
}
