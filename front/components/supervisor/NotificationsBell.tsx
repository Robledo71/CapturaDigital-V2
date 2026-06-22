'use client'

import { useEffect, useState } from 'react'
import { Bell, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { getInventoryAlertsAction, type InventoryAlert } from '@/app/actions/get-inventory-alerts'

export function NotificationsBell() {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    getInventoryAlertsAction()
      .then((a) => {
        if (!cancelled) setAlerts(a)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const count = alerts.length

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notificaciones${count > 0 ? ` (${count})` : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-200 hover:bg-white/10 hover:text-white transition-colors"
      >
        <Bell size={17} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
            {count}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop para cerrar al hacer clic afuera */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1 w-80 max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl dark:border-[#1a2d4d] dark:bg-[#0c1829]"
          >
            <div className="border-b border-slate-100 dark:border-[#1a2d4d] px-4 py-2.5">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Alertas de inventario</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
                <Loader2 size={15} className="animate-spin" /> Cargando…
              </div>
            ) : count === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Sin alertas. Ningún inventario llegó al 80%.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-[#1a2d4d]">
                {alerts.map((a) => (
                  <li key={a.orderId} className="flex items-start gap-2.5 px-4 py-3">
                    {a.complete ? (
                      <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0 text-green-500" aria-hidden="true" />
                    ) : (
                      <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-amber-500" aria-hidden="true" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 dark:text-slate-100">
                        Orden <span className="font-mono font-semibold">{a.consecutiveNumber ?? a.orderId}</span> ·{' '}
                        {a.complete ? (
                          <span className="font-semibold text-green-600 dark:text-green-400">inventario completado (100%)</span>
                        ) : (
                          <>
                            <span className="font-semibold text-amber-600 dark:text-amber-400">{Math.round(a.pct * 100)}%</span> del inventario
                          </>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {a.done.toLocaleString('es-MX')}/{a.total.toLocaleString('es-MX')} pzs · {a.clientName ?? '—'} · {a.plantName}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
