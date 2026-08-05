import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { Sidebar } from '@/front/components/servicio-cliente/Sidebar'
import { TopBar } from '@/front/components/servicio-cliente/TopBar'

export default async function ServicioClienteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session || !can(session, 'servicio_cliente.ver')) redirect('/')

  const canVerInformales = can(session, 'ordenes_informales.ver')

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5F7] dark:bg-[#070e1a]">
      <Sidebar
        user={{
          nombreCompleto: session.nombreCompleto,
          rol: session.rol,
          permisos: session.permisos,
        }}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar con la campana de notificaciones de órdenes informales. */}
        <TopBar showNotifications={canVerInformales} />
        {children}
      </div>
    </div>
  )
}
