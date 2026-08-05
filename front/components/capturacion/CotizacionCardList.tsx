'use client'

import { ChevronDown, ChevronUp, LockKeyhole, LockKeyholeOpen } from 'lucide-react'
import type { CotizacionRow } from '@/back/services/cotizacionesService'
import { useExpandableList } from '@/front/lib/useExpandableList'
import { ToggleButton } from '@/front/components/capturacion/DesbloquearCotizacionesClient'

// Derive the callback prop types directly from `ToggleButton` so this list
// always matches its exact signature, even though `ConfirmTarget` isn't exported.
type ToggleButtonComponentProps = Parameters<typeof ToggleButton>[0]

interface CotizacionCardListProps {
  cotizaciones: CotizacionRow[]
  onToggle: ToggleButtonComponentProps['onToggle']
  onRequestConfirm: ToggleButtonComponentProps['onRequestConfirm']
  registerSubmit: ToggleButtonComponentProps['registerSubmit']
}

export function CotizacionCardList({
  cotizaciones,
  onToggle,
  onRequestConfirm,
  registerSubmit,
}: CotizacionCardListProps) {
  const { expandedId, toggle } = useExpandableList<number>()

  if (cotizaciones.length === 0) {
    return <p className="text-center text-sm text-slate-500 py-8">Sin resultados para la búsqueda.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {cotizaciones.map((c) => (
        <div
          key={c.id}
          className="rounded-2xl bg-white dark:bg-[#0c1829] border border-slate-100 dark:border-[#0c1829] shadow-sm overflow-hidden"
        >
          <button
            type="button"
            onClick={() => toggle(c.id)}
            className="w-full flex items-start gap-3 p-4 min-h-11 text-left"
          >
            <div className="flex-1 min-w-0">
              <p className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                {c.consecutiveNumber ?? '—'}
              </p>
              <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                {c.clientName ?? '—'}
              </p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  c.desbloqueado
                    ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400'
                }`}
              >
                {c.desbloqueado ? (
                  <>
                    <LockKeyholeOpen size={11} /> Desbloqueada
                  </>
                ) : (
                  <>
                    <LockKeyhole size={11} /> Bloqueada
                  </>
                )}
              </span>
              {expandedId === c.id ? (
                <ChevronUp size={18} className="text-slate-400" />
              ) : (
                <ChevronDown size={18} className="text-slate-400" />
              )}
            </div>
          </button>

          {expandedId === c.id && (
            <div className="animate-slide-up border-t border-slate-100 dark:border-[#1a2d4d]">
              <div className="grid grid-cols-2 gap-3 p-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Orden</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{c.orderConsecutive ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Email</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 truncate" title={c.clientEmail ?? ''}>
                    {c.clientEmail ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Estado</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{c.status ?? '—'}</p>
                </div>
              </div>
              <div className="px-4 pb-4">
                <div className="w-full">
                  <ToggleButton
                    cotizacion={c}
                    onToggle={onToggle}
                    onRequestConfirm={onRequestConfirm}
                    registerSubmit={registerSubmit}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
