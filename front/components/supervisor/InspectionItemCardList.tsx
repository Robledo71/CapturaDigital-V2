'use client'

import { ChevronDown, ChevronUp, Edit2 } from 'lucide-react'
import type { InspectionItemRow } from '@/back/services/reporteDetalleService'
import { useExpandableList } from '@/front/lib/useExpandableList'

interface InspectionItemCardListProps {
  items: InspectionItemRow[]
  onEditItem?: (item: InspectionItemRow) => void
}

export function InspectionItemCardList({ items, onEditItem }: InspectionItemCardListProps) {
  const { expandedId, toggle } = useExpandableList<number>()

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl bg-white dark:bg-[#0c1829] border border-slate-100 dark:border-[#1a2d4d] shadow-sm overflow-hidden"
        >
          <button
            type="button"
            onClick={() => toggle(item.id)}
            className="w-full flex items-start gap-3 p-4 min-h-11 text-left"
          >
            <div className="flex-1 min-w-0">
              <p className="wrap-break-word text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400 font-mono">
                {item.partNumber ?? '—'}
              </p>
              <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{item.partName ?? '—'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {item.inspected.toLocaleString('es-MX')} inspeccionadas
              </p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-3">
              <div className="flex flex-col items-end gap-1 text-xs tabular-nums">
                <span className={item.ok > 0 ? 'font-medium text-green-500' : 'text-slate-400'}>
                  OK {item.ok.toLocaleString('es-MX')}
                </span>
                <span className={item.ng > 0 ? 'font-bold text-orange-400' : 'text-slate-400'}>
                  NG {item.ng.toLocaleString('es-MX')}
                </span>
              </div>
              {expandedId === item.id ? (
                <ChevronUp size={18} className="text-slate-400" />
              ) : (
                <ChevronDown size={18} className="text-slate-400" />
              )}
            </div>
          </button>

          {expandedId === item.id && (
            <div className="animate-slide-up border-t border-slate-100 dark:border-[#1a2d4d]">
              <div className="grid grid-cols-2 gap-3 p-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Lote</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{item.lote ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Serie</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{item.serie ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Identificadores</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{item.identificadores ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Scrap</p>
                  <p className={`text-sm mt-0.5 tabular-nums ${item.scrap === 0 ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                    {item.scrap.toLocaleString('es-MX')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Recuperadas</p>
                  <p className="text-sm text-slate-900 dark:text-white mt-0.5 tabular-nums">
                    {item.recovered.toLocaleString('es-MX')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Incidencias</p>
                  <p className="text-sm text-slate-900 dark:text-white mt-0.5 tabular-nums">
                    {item.incidents.length === 0 ? '—' : item.incidents.length}
                  </p>
                </div>
              </div>

              {item.incidents.length > 0 && (
                <ul className="flex flex-col gap-1.5 px-4 pb-4">
                  {item.incidents.map((inc, i) => (
                    <li key={i} className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                      <span>{inc.description}</span>
                      <span className="tabular-nums font-medium">{inc.count}</span>
                    </li>
                  ))}
                </ul>
              )}

              {onEditItem && (
                <div className="px-4 pb-4">
                  <button
                    type="button"
                    onClick={() => onEditItem(item)}
                    aria-label={`Editar ítem ${item.partNumber ?? item.partName ?? item.id}`}
                    className="w-full inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#1a2d4d] text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-[#1a2d4d] transition-colors"
                  >
                    <Edit2 size={13} aria-hidden="true" />
                    Editar
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
