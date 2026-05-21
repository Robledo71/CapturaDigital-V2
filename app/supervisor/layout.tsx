import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { Sidebar } from '@/front/components/supervisor/Sidebar'

export default async function SupervisorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session || !session.nombreCompleto) redirect('/')

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-[#070e1a]">
      <Sidebar user={{ nombreCompleto: session.nombreCompleto, rol: session.rol }} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
