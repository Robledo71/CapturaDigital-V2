import { redirect } from 'next/navigation'
import { Plus, Tablet } from 'lucide-react'
import Link from 'next/link'
import { getSession } from '@/back/services/session'
import { getSupervisorDashboardStats, getDashboardBandeja, getDashboardProduccion } from '@/back/services/dashboardService'
import type { BandejaReporteRow, ProduccionItem } from '@/back/services/dashboardService'
import { TopBar } from '@/front/components/supervisor/TopBar'
import { StatCard } from '@/front/components/supervisor/StatCard'
import { QualityTable } from '@/front/components/supervisor/QualityTable'
import { ProductionPanel } from '@/front/components/supervisor/ProductionPanel'
import { LiveClock } from '@/front/components/supervisor/LiveClock'
import { AutoRefresh } from '@/front/components/supervisor/AutoRefresh'

export default async function SupervisorPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const [stats, bandeja, produccion] = await Promise.all([
    getSupervisorDashboardStats(String(session.userId)),
    getDashboardBandeja(String(session.userId)),
    getDashboardProduccion(String(session.userId)),
  ])
  const firstName = session.nombreCompleto.split(' ')[0]

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar />

      {/* Scrollable main area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

        {/* Page header */}
        <div className="flex items-start justify-between">
          <LiveClock nombre={firstName} esperanRevision={stats.esperanRevision} />
          <div className="flex items-center gap-3">
            <Link
              href="/supervisor/tablets"
              className="border border-black dark:border-[#1a2d4d] rounded-lg px-4 py-2 text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors"
            >
              <Tablet size={15} />
              Tablets
            </Link>
            <Link
              href="/supervisor/carga-trabajo"
              className="bg-blue-600 hover:bg-blue-500 text-white dark:text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Plus size={15} />
              Carga de trabajo
            </Link>
          </div>
        </div>

        {/* 4 stat cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Pendientes en piso"
            value={String(stats.pendientesEnPiso)}
            subtitle={`${stats.pendientesEnPiso} reporte${stats.pendientesEnPiso !== 1 ? 's' : ''} en proceso`}
            dotColor="yellow"
          />
          <StatCard
            label="Esperan tu revisión"
            value={String(stats.esperanRevision)}
            subtitle={stats.esperanRevision === 0 ? 'Sin reportes pendientes' : `${stats.esperanRevision} reporte${stats.esperanRevision !== 1 ? 's' : ''} por revisar`}
            dotColor="blue"
          />
          <StatCard
            label="Publicados hoy"
            value={String(stats.publicadosHoy)}
            subtitle={stats.publicadosHoy === 0 ? 'Sin publicaciones hoy' : `${stats.publicadosHoy} reporte${stats.publicadosHoy !== 1 ? 's' : ''} publicados`}
            dotColor="green"
          />
          <StatCard
            label="% NG acumulado · semana"
            value={stats.pctNGSemana}
            subtitle=""
            dotColor="none"
            chart
          />
        </div>

        {/* Bottom row: quality table + production panel */}
        <div className="flex gap-4 flex-1 min-h-0">
          <div className="flex-1 min-w-0">
            <QualityTable rows={bandeja} />
          </div>
          <div className="w-[380px] flex-shrink-0">
            <ProductionPanel items={produccion} />
          </div>
        </div>

        <AutoRefresh />

      </div>
    </div>
  )
}
