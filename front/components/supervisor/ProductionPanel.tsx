import type { ProduccionItem } from '@/back/services/dashboardService'

const STATUS_CLASSES: Record<ProduccionItem['status'], string> = {
  Pendiente: 'bg-yellow-100 text-yellow-700 border border-yellow-300 dark:bg-yellow-500/15 dark:text-yellow-400 dark:border-yellow-500/30 text-xs px-2 py-0.5 rounded-full',
  Enviado: 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30 text-xs px-2 py-0.5 rounded-full',
}

interface ProductionPanelProps {
  items: ProduccionItem[]
}

export function ProductionPanel({ items }: ProductionPanelProps) {
  return (
    <div className="rounded-xl bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:bg-[#0f2038] dark:border-[#1a2d4d] dark:shadow-none p-5 flex flex-col gap-4 h-full overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-[#1a2d4d] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-[#2a4070]">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <span className="text-slate-900 dark:text-white font-semibold text-sm">Producción en vivo</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" aria-hidden="true" />
          <span className="text-green-500 text-xs font-medium">EN VIVO</span>
        </div>
      </div>

      {/* Inspector items */}
      <div className="flex flex-col gap-4">
        {items.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">No hay sesiones activas en este momento.</p>
        ) : items.map((item) => {
          const percentage = item.total > 0 ? Math.round((item.current / item.total) * 100) : 0
          const fillWidth = `${percentage}%`

          return (
            <div key={item.report} className="flex flex-col gap-2">
              {/* Top row */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-white dark:text-white text-xs font-medium">{item.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-slate-900 dark:text-white text-sm leading-tight truncate">{item.operadores}</span>
                  <span className="text-slate-500 text-xs ml-1.5">· {item.report}</span>
                </div>
                <span className={STATUS_CLASSES[item.status]}>{item.status}</span>
              </div>

              {/* Progress bar */}
              <div
                className="h-1.5 rounded-full bg-slate-200 dark:bg-[#1a2d4d] overflow-hidden"
                role="progressbar"
                aria-valuenow={percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progreso de ${item.operadores}`}
              >
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: fillWidth }}
                />
              </div>

              {/* Bottom row */}
              <div className="flex items-center">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {item.current.toLocaleString()} / {item.total.toLocaleString()}
                </span>
                <span className="text-xs text-slate-700 dark:text-slate-300 ml-auto">{percentage}%</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Divider */}
      <div className="border-t border-blue-200 dark:border-[#1a2d4d]" />
    </div>
  )
}
