'use client'

import { ChevronDown, ChevronUp, Download } from 'lucide-react'
import type { PublishedReporteRow } from '@/back/services/publishedReportesService'
import { useExpandableList } from '@/front/lib/useExpandableList'
import { StatusBadge } from '@/front/components/capturacion/ReportesPublicadosClient'

interface ReporteCardListProps {
  rows: PublishedReporteRow[]
  canDescargar: boolean
  downloadedIds: Set<string>
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onDownload: (row: PublishedReporteRow) => void
  onRowClick?: (row: PublishedReporteRow) => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function ReporteCardList({
  rows,
  canDescargar,
  downloadedIds,
  selectedIds,
  onToggleSelect,
  onDownload,
  onRowClick,
}: ReporteCardListProps) {
  const { expandedId, toggle } = useExpandableList<string>()

  if (rows.length === 0) {
    return <p className="text-center text-sm text-slate-500 py-8">Sin resultados para esa búsqueda</p>
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
            onClick={() => {
              toggle(row.id)
              onRowClick?.(row)
            }}
            className="w-full flex items-start gap-3 p-4 min-h-11 text-left"
          >
            {canDescargar && (
              <div className="flex-shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(row.id)}
                  onChange={() => onToggleSelect(row.id)}
                  aria-label={`Seleccionar reporte ${row.id}`}
                  className="accent-blue-500 cursor-pointer"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-mono text-xs font-bold text-slate-900 dark:text-white">{row.id}</p>
              <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{row.cliente}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{row.planta}</p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-3">
              <StatusBadge status={downloadedIds.has(row.id) ? 'Descargado' : 'Pendiente'} />
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
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Cotización</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{row.cotizacion}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400"># Parte</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{row.parte}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Piezas</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 tabular-nums">
                    {row.piezas.toLocaleString('es-MX')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">%NG</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 tabular-nums">
                    {(row.pctNG * 100).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Publicado</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{formatDate(row.publicadoAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Supervisor</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{row.supervisor}</p>
                </div>
              </div>
              {canDescargar && (
                <div className="px-4 pb-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDownload(row)
                    }}
                    className="w-full min-h-11 flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-[#1a2d4d] text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-[#1a2d4d] transition-colors"
                  >
                    <Download size={14} />
                    Descargar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
