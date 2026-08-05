'use client'

import { ChevronDown, ChevronUp, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { OrderWorkload } from '@/back/services/cargaDeTrabajoService'
import { getOrderInventory, isIndefiniteInventoryPlant } from '@/front/lib/inventory'
import { useExpandableList } from '@/front/lib/useExpandableList'
import { countPendingUnassigned } from '@/front/components/supervisor/CargaDeTrabajoPage'

interface OrderCardListProps {
  orders: OrderWorkload[]
  onRowClick: (order: OrderWorkload) => void
}

export function OrderCardList({ orders, onRowClick }: OrderCardListProps) {
  const { expandedId, toggle } = useExpandableList<number>()

  if (orders.length === 0) {
    return <p className="text-center text-sm text-slate-500 py-8">Sin órdenes activas asignadas.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {orders.map((order) => {
        const pending = countPendingUnassigned(order)
        const inv = getOrderInventory(order.items, isIndefiniteInventoryPlant(order.plantName))
        const invPct = Math.round(inv.pct * 100)

        return (
          <div
            key={order.id}
            className="rounded-2xl bg-white dark:bg-[#0c1829] border border-slate-100 dark:border-[#0c1829] shadow-sm overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggle(order.id)}
              className="w-full flex items-start gap-3 p-4 min-h-11 text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs font-bold text-slate-900 dark:text-white">{order.consecutiveNumber}</p>
                <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{order.clientName}</p>
                <p title={`${order.partNumber} · ${order.plantName}`} className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {order.partNumber} · {order.plantName}
                </p>
              </div>
              <div className="flex-shrink-0 flex items-center gap-3">
                <div className="flex flex-col items-end gap-1">
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-100 dark:border-[#25395f] dark:bg-[#111a30] px-2 text-xs text-slate-500 dark:text-slate-400">
                    {order.items.length} items
                  </span>
                  {pending > 0 && (
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 px-2 text-xs font-medium text-blue-400">
                      {pending} sin asignar
                    </span>
                  )}
                </div>
                {expandedId === order.id ? (
                  <ChevronUp size={18} className="text-slate-400" />
                ) : (
                  <ChevronDown size={18} className="text-slate-400" />
                )}
              </div>
            </button>

            {expandedId === order.id && (
              <div className="animate-slide-up border-t border-slate-100 dark:border-[#1a2d4d]">
                <div className="grid grid-cols-2 gap-3 p-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Planta</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{order.plantName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Inventario</p>
                    {inv.indefinite ? (
                      <p className="text-sm italic text-slate-400 mt-0.5">Indefinido</p>
                    ) : inv.total === 0 ? (
                      <p className="text-sm text-slate-400 mt-0.5">—</p>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {inv.complete ? (
                          <CheckCircle2 size={14} className="flex-shrink-0 text-green-500" aria-label="Inventario completado" />
                        ) : inv.level === 'warning' ? (
                          <AlertTriangle size={14} className="flex-shrink-0 text-amber-500" aria-label="Inventario por agotarse" />
                        ) : null}
                        <span
                          className={`text-sm tabular-nums ${
                            inv.complete
                              ? 'font-semibold text-green-600 dark:text-green-400'
                              : inv.level === 'warning'
                                ? 'font-semibold text-amber-600 dark:text-amber-400'
                                : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {inv.done.toLocaleString('es-MX')}/{inv.total.toLocaleString('es-MX')} ({invPct}%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="px-4 pb-4">
                  <button
                    type="button"
                    onClick={() => onRowClick(order)}
                    className="w-full min-h-11 rounded-lg border border-slate-200 dark:border-[#1a2d4d] text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-[#1a2d4d] transition-colors"
                  >
                    Ver detalle
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
