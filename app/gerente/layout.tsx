import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { Sidebar } from '@/front/components/gerente/Sidebar'
import { MobileMenuProvider } from '@/front/components/supervisor/MobileMenuContext'

export default async function GerenteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session || !can(session, 'gerente.ver')) redirect('/')

  return (
    <MobileMenuProvider>
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#070e1a]">
        <Sidebar
          user={{
            nombreCompleto: session.nombreCompleto,
            rol: session.rol,
            permisos: session.permisos,
          }}
        />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">{children}</div>
      </div>
    </MobileMenuProvider>
  )
}
