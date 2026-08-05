import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { Sidebar } from '@/front/components/capturacion/Sidebar'
import { TopBar } from '@/front/components/capturacion/TopBar'
import { MobileMenuProvider } from '@/front/components/supervisor/MobileMenuContext'


export default async function CapturacionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session || !can(session, 'capturacion.ver')) redirect('/')

  const canVerInformales = can(session, 'ordenes_informales.ver')

  return (
    <MobileMenuProvider>
      <div className="flex h-screen overflow-hidden bg-[#F5F5F7] dark:bg-[#070e1a]">
        <Sidebar
          user={{
            nombreCompleto: session.nombreCompleto,
            rol: session.rol,
            permisos: session.permisos,
          }}
        />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <TopBar showNotifications={canVerInformales} />
          {children}
        </div>
      </div>
    </MobileMenuProvider>
  )
}
