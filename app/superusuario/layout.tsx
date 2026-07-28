import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { Sidebar } from '@/front/components/superusuario/Sidebar'

export default async function SuperusuarioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session || session.rol !== 'superusuario') redirect('/')

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5F7] dark:bg-[#070e1a]">
      <Sidebar
        user={{
          nombreCompleto: session.nombreCompleto,
          rol: session.rol,
          permisos: session.permisos,
        }}
      />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">{children}</div>
    </div>
  )
}
