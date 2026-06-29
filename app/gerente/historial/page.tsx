import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getEditHistory } from '@/back/services/editHistoryService'
import { HistorialCambiosTable } from '@/front/components/historial/HistorialCambiosTable'

export const metadata = {
  title: 'Historial — Gerencia',
}

export default async function GerenteHistorialPage() {
  const session = await getSession()
  if (!session || !can(session, 'historial.ver')) redirect('/')

  const rows = await getEditHistory(session.accessToken)

  return <HistorialCambiosTable rows={rows} />
}
