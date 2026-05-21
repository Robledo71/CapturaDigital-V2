import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { getSupervisorReportes, getUnassignedCount, PAGE_SIZE } from '@/back/services/reportesService'
import { TopBar } from '@/front/components/supervisor/TopBar'
import { ReportesPage } from '@/front/components/supervisor/ReportesPage'
import { AutoRefresh } from '@/front/components/supervisor/AutoRefresh'

export const metadata = {
  title: 'Reportes de inspección — Captura Digital',
}

export default async function ReportesRoute({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; page?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/')

  const { mode: modeParam, page: pageParam } = await searchParams
  const mode: 'assigned' | 'unassigned' = modeParam === 'unassigned' ? 'unassigned' : 'assigned'
  const page = Math.max(1, Number.isInteger(Number(pageParam)) ? Math.max(1, Number(pageParam)) : 1)

  const [{ rows: reportes, total }, unassignedCount] = await Promise.all([
    getSupervisorReportes(session.userId, mode, page),
    getUnassignedCount(),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar crumb="Reportes" />
      <ReportesPage
        initialReportes={reportes}
        mode={mode}
        unassignedCount={unassignedCount}
        page={page}
        totalPages={totalPages}
        total={total}
      />
      <AutoRefresh />
    </div>
  )
}
