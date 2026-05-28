import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { getSupervisorReportes, PAGE_SIZE } from '@/back/services/reportesService'
import { TopBar } from '@/front/components/supervisor/TopBar'
import { ReportesPage } from '@/front/components/supervisor/ReportesPage'
import { AutoRefresh } from '@/front/components/supervisor/AutoRefresh'

export const metadata = {
  title: 'Reportes de inspección — Captura Digital',
}

export default async function ReportesRoute({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/')

  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number.isInteger(Number(pageParam)) ? Math.max(1, Number(pageParam)) : 1)

  const { rows: reportes, total } = await getSupervisorReportes(String(session.userId), page)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar crumb="Reportes" />
      <ReportesPage
        initialReportes={reportes}
        page={page}
        totalPages={totalPages}
        total={total}
      />
      <AutoRefresh />
    </div>
  )
}
