import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { SideBar } from '@/front/components/admin/SideBar'
import { MobileMenuProvider } from '@/front/components/supervisor/MobileMenuContext'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session || !can(session, 'admin.ver')) redirect('/')

  return (
    <MobileMenuProvider>
      <div className="flex h-screen overflow-hidden bg-[#F5F5F7] dark:bg-[#070e1a]">
        <SideBar user={{ nombreCompleto: session.nombreCompleto, rol: session.rol }} />
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">{children}</div>
      </div>
    </MobileMenuProvider>
  )
}
