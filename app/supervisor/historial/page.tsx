import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getEditHistory } from '@/back/services/editHistoryService'
import { TopBar } from '@/front/components/supervisor/TopBar'
import { AccesoRestringido } from '@/front/components/ui/AccesoRestringido'
import { HistorialCambiosTable } from '@/front/components/historial/HistorialCambiosTable'

export const metadata = {
  title: 'Historial de cambios — Captura Digital',
}

export default async function HistorialPage() {
  const session = await getSession()
  if (!session) redirect('/')
  if (!can(session, 'historial.ver')) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar crumb="Historial de cambios" />
        <AccesoRestringido mensaje="No tienes permiso para ver el historial de cambios." />
      </div>
    )
  }

  const rows = await getEditHistory(session.accessToken)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar crumb="Historial de cambios" />
      <HistorialCambiosTable rows={rows} />
    </div>
  )
}
