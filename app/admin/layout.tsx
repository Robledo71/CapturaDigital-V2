import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { SideBar } from '@/front/components/admin/SideBar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session || !can(session, 'admin.ver')) redirect('/')

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5F7] dark:bg-[#070e1a]">
      <SideBar user={{ nombreCompleto: session.nombreCompleto, rol: session.rol }} />
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
  )
}
