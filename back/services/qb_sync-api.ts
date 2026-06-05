import 'server-only'

// Cliente HTTP para la API interna qb_sync (la BD ahora vive en el VPS).
// Toda consulta a la BD debe pasar por esta API — nada de Prisma directo.

function baseUrl(): string {
  return (process.env.QSYNC_API_URL ?? '').replace(/\/$/, '')
}

function headers(accessToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-App-Token': process.env.X_APP_TOKEN ?? '',
    Authorization: `Bearer ${accessToken}`,
  }
}

/**
 * Verifica si una orden ya existe en la base de datos.
 *
 * Endpoint: GET /qb_sync/quotations/order-exists/:id
 * Requiere X-App-Token + JWT Bearer (rol admin/supervisor/lider/capturacion).
 * Respuesta: { success: true, exists: boolean }
 */
export async function orderExists(orderId: number, accessToken: string): Promise<boolean> {
  const res = await fetch(`${baseUrl()}/qb_sync/quotations/order-exists/${orderId}`, {
    headers: headers(accessToken),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`orderExists: la API respondió ${res.status}`)
  }

  const json = await res.json()
  return json.exists === true
}
