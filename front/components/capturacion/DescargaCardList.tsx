'use client'

import { ChevronDown, ChevronUp, Download } from 'lucide-react'
import type { DownloadRecord } from '@/front/lib/downloadHistory'
import { useExpandableList } from '@/front/lib/useExpandableList'

interface DescargaCardListProps {
  records: DownloadRecord[]
  onRedownload: (record: DownloadRecord) => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function DescargaCardList({ records, onRedownload }: DescargaCardListProps) {
  const { expandedId, toggle } = useExpandableList<string>()

  if (records.length === 0) {
    return <p className="text-center text-sm text-slate-500 py-8">Sin resultados para esa búsqueda</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {records.map((record) => (
        <div
          key={record.id}
          className="rounded-2xl bg-white dark:bg-[#0c1829] border border-slate-100 dark:border-[#0c1829] shadow-sm overflow-hidden"
        >
          <button
            type="button"
            onClick={() => toggle(record.id)}
            className="w-full flex items-start gap-3 p-4 min-h-11 text-left"
          >
            <div className="flex-1 min-w-0">
              <p className="font-mono text-xs font-bold text-slate-900 dark:text-white">{record.id}</p>
              <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{record.cliente}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{record.planta}</p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(record.downloadedAt)}</span>
              {expandedId === record.id ? (
                <ChevronUp size={18} className="text-slate-400" />
              ) : (
                <ChevronDown size={18} className="text-slate-400" />
              )}
            </div>
          </button>

          {expandedId === record.id && (
            <div className="animate-slide-up border-t border-slate-100 dark:border-[#1a2d4d]">
              <div className="grid grid-cols-2 gap-3 p-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Cotización</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{record.cotizacion}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400"># Parte</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{record.parte}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Piezas</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 tabular-nums">
                    {record.piezas.toLocaleString('es-MX')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">%NG</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 tabular-nums">
                    {(record.pctNG * 100).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Publicado</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{formatDate(record.publicadoAt)}</p>
                </div>
              </div>
              <div className="px-4 pb-4">
                <button
                  type="button"
                  onClick={() => onRedownload(record)}
                  className="w-full min-h-11 flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-[#1a2d4d] text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-[#1a2d4d] transition-colors"
                >
                  <Download size={14} />
                  Volver a descargar
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
