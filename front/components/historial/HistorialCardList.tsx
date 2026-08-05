'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import type { EditHistoryRow } from '@/back/services/editHistoryService'
import { useExpandableList } from '@/front/lib/useExpandableList'

interface HistorialCardListProps {
  rows: EditHistoryRow[]
  onRowClick: (row: EditHistoryRow) => void
  formatFecha: (iso: string) => string
}

export function HistorialCardList({ rows, onRowClick, formatFecha }: HistorialCardListProps) {
  const { expandedId, toggle } = useExpandableList<number>()

  if (rows.length === 0) {
    return <p className="text-center text-sm text-slate-500 py-8">Sin cambios registrados.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div
          key={row.id}
          className="rounded-2xl bg-white dark:bg-[#0c1829] border border-slate-100 dark:border-[#0c1829] shadow-sm overflow-hidden"
        >
          <button
            type="button"
            onClick={() => toggle(row.id)}
            className="w-full flex items-start gap-3 p-4 min-h-11 text-left"
          >
            <div className="flex-1 min-w-0">
              <p className="font-mono text-xs text-slate-600 dark:text-slate-400">#{row.dailyReportConsecutive}</p>
              <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{row.usuario}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={row.motivo}>
                {row.motivo}
              </p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                {formatFecha(row.createdAt)}
              </span>
              {expandedId === row.id ? (
                <ChevronUp size={18} className="text-slate-400" />
              ) : (
                <ChevronDown size={18} className="text-slate-400" />
              )}
            </div>
          </button>

          {expandedId === row.id && (
            <div className="animate-slide-up border-t border-slate-100 dark:border-[#1a2d4d]">
              <div className="grid grid-cols-2 gap-3 p-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Ítem</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 tabular-nums">
                    {row.reportItemId ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Motivo</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{row.motivo}</p>
                </div>
              </div>
              <div className="px-4 pb-4">
                <button
                  type="button"
                  onClick={() => onRowClick(row)}
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
