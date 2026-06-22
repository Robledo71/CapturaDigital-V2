import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { AccesoRestringido } from '@/front/components/ui/AccesoRestringido'
import { MisDescargasClient } from '@/front/components/capturacion/MisDescargasClient'

export default async function MisDescargasPage() {
  const session = await getSession()
  if (!session || !can(session, 'ordenes.descargar')) {
    return <AccesoRestringido mensaje="No tienes permiso para descargar reportes." />
  }
  return <MisDescargasClient />
}
