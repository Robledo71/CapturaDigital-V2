import { getSession } from '@/back/services/session'
import { getEditHistory } from '@/back/services/editHistoryService'
import { TopBar } from '@/front/components/supervisor/TopBar'
import { HistorialCambiosTable } from '@/front/components/historial/HistorialCambiosTable'

export const metadata = {
  title: 'Historial de cambios — Captura Digital',
}

export default async function HistorialPage() {
  const session = await getSession()
  const rows = await getEditHistory(session?.accessToken ?? '')

  return (
    <>
      <TopBar crumb="Historial de cambios" homeHref="/superusuario" />
      <HistorialCambiosTable rows={rows} />
    </>
  )
}
