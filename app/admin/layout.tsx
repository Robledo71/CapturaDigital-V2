import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { SideBar } from '@/front/components/admin/SideBar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session || session.rol !== 'admin') redirect('/')

  return (
    <div className="flex h-screen overflow-hidden bg-blue-50/50 dark:bg-[#070e1a]">
      <SideBar user={{ nombreCompleto: session.nombreCompleto, rol: session.rol }} />
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
  )
}
