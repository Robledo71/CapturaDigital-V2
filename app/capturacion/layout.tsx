import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { Sidebar } from '@/front/components/capturacion/Sidebar'

const ALLOWED_ROLES = new Set(['capturacion', 'admin', 'lider'])

export default async function CapturacionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session || !ALLOWED_ROLES.has(session.rol)) redirect('/')

  return (
    <div className="flex h-screen overflow-hidden bg-blue-50/50 dark:bg-[#070e1a]">
      <Sidebar user={{ nombreCompleto: session.nombreCompleto, rol: session.rol }} />
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
  )
}
