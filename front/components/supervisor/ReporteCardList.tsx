'use client'

import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { ReporteRow } from '@/back/services/reportesService'
import { useExpandableList } from '@/front/lib/useExpandableList'
import { EstatusBadge, InspectorAvatar } from '@/front/components/supervisor/ReportesPage'

interface ReporteCardListProps {
  rows: ReporteRow[]
  detailHrefBase: string
}

// ─── Local %NG severity helper ─────────────────────────────────────────────────
// Mirrors the thresholds of `ngSemaphoreColor` in GerenteDashboard.tsx (>3% red,
// 1-3% amber, <1% green), re-implemented locally as Tailwind classes since
// `r.pctNG` here is already a formatted string (e.g. "1.50%").

function pctNGSeverityColor(pctNG: string): string {
  const value = parseFloat(pctNG.replace('%', ''))
  const safeValue = Number.isNaN(value) ? 0 : value
  if (safeValue > 3) return 'bg-red-500'
  if (safeValue > 1) return 'bg-amber-500'
  return 'bg-green-500'
}

export function ReporteCardList({ rows, detailHrefBase }: ReporteCardListProps) {
  const { expandedId, toggle } = useExpandableList<string>()
  const router = useRouter()

  if (rows.length === 0) {
    return <p className="text-center text-sm text-slate-500 py-8">No se encontraron reportes con los filtros actuales.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div
          key={r.id}
          className="rounded-2xl bg-white dark:bg-[#0c1829] border border-slate-100 dark:border-[#0c1829] shadow-sm overflow-hidden"
        >
          <button
            type="button"
            onClick={() => toggle(r.id)}
            className="w-full flex items-start gap-3 p-4 min-h-11 text-left"
          >
            <div className="flex-1 min-w-0">
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{r.id}</p>
              <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{r.cliente}</p>
              <p title={`${r.parte} · ${r.cotizacion}`} className="text-xs text-slate-500 dark:text-slate-400">
                {r.parte} · {r.cotizacion}
              </p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-3">
              <div className="flex flex-col items-end gap-1">
                <EstatusBadge estatus={r.estatus} />
                <div className="flex flex-col items-end gap-0.5 w-16">
                  <span className="text-xs font-medium tabular-nums text-slate-700 dark:text-slate-300">{r.pctNG}</span>
                  <div className="h-1 w-full rounded-full bg-slate-200 dark:bg-[#1a2d4d] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pctNGSeverityColor(r.pctNG)}`}
                      style={{ width: `${Math.min(parseFloat(r.pctNG) * 8 || 0, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              {expandedId === r.id ? (
                <ChevronUp size={18} className="text-slate-400" />
              ) : (
                <ChevronDown size={18} className="text-slate-400" />
              )}
            </div>
          </button>

          {expandedId === r.id && (
            <div className="animate-slide-up border-t border-slate-100 dark:border-[#1a2d4d]">
              <div className="grid grid-cols-2 gap-3 p-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Inspector</p>
                  <InspectorAvatar nombre={r.inspector} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Turno</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{r.turno}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Piezas</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 tabular-nums">{r.piezas}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Planta</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{r.planta}</p>
                </div>
              </div>
              <div className="px-4 pb-4">
                <button
                  type="button"
                  onClick={() => router.push(`${detailHrefBase}/${r.id}`)}
                  className="w-full min-h-11 rounded-lg border border-slate-200 dark:border-[#1a2d4d] text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-[#1a2d4d] transition-colors"
                >
                  Ver detalle
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
