import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { TopBar } from '@/front/components/supervisor/TopBar'
import { AccesoRestringido } from '@/front/components/ui/AccesoRestringido'
import { MisDescargasClient } from '@/front/components/capturacion/MisDescargasClient'

export default async function MisDescargasPage() {
  const session = await getSession()
  if (!session || !can(session, 'ordenes.descargar')) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar crumb="Mis descargas" homeHref="/capturacion" />
        <AccesoRestringido mensaje="No tienes permiso para descargar reportes." />
      </div>
    )
  }
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar crumb="Mis descargas" homeHref="/capturacion" />
      <MisDescargasClient />
    </div>
  )
}
