'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, ClipboardList, Loader2, X } from 'lucide-react'
import {
  getInformalOrdersNotificationsAction,
  type InformalOrderNotif,
} from '@/app/actions/get-informal-orders-notifications'

const DISMISSED_STORAGE_KEY = 'qb_dismissed_informal_orders'
const POLL_INTERVAL_MS = 60_000

// Clave estable por item de orden informal (id único por fila).
function notifKey(n: InformalOrderNotif): string {
  return String(n.itemOrdenInformalId)
}

// Tiempo relativo corto ("hace 5 min", "hace 2 h", "hace 3 d").
function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffMin = Math.floor((Date.now() - then) / 60_000)
  if (diffMin < 1) return 'hace un momento'
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `hace ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  return `hace ${diffD} d`
}

function loadDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(DISMISSED_STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? new Set(arr.filter((x): x is string => typeof x === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

function persistDismissed(set: Set<string>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify([...set]))
  } catch {
    /* localStorage no disponible — descarte solo en memoria */
  }
}

interface InformalOrdersBellProps {
  /** Ruta a la vista de órdenes informales del portal (destino al hacer clic). */
  detailHref: string
}

export function InformalOrdersBell({ detailHref }: InformalOrdersBellProps) {
  const [notifs, setNotifs] = useState<InformalOrderNotif[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  // Carga inicial + polling: mantiene la lista al día para enterarse de nuevas
  // órdenes informales sin recargar la página.
  useEffect(() => {
    let cancelled = false
    setDismissed(loadDismissed())

    async function fetchNotifs() {
      const data = await getInformalOrdersNotificationsAction()
      if (!cancelled) {
        setNotifs(data)
        setLoading(false)
      }
    }

    fetchNotifs()
    const id = setInterval(fetchNotifs, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  function handleDismiss(n: InformalOrderNotif) {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(notifKey(n))
      persistDismissed(next)
      return next
    })
  }

  function handleDismissAll() {
    setDismissed(() => {
      const next = new Set(notifs.map(notifKey))
      persistDismissed(next)
      return next
    })
  }

  const visible = notifs.filter((n) => !dismissed.has(notifKey(n)))
  const count = visible.length

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notificaciones${count > 0 ? ` (${count})` : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
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
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1 max-h-96 w-80 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl dark:border-[#1a2d4d] dark:bg-[#0c1829]"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-[#1a2d4d]">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Órdenes informales</p>
              {count > 0 && (
                <button
                  type="button"
                  onClick={handleDismissAll}
                  className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  Marcar todas
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
                <Loader2 size={15} className="animate-spin" /> Cargando…
              </div>
            ) : count === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Sin órdenes informales nuevas.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-[#1a2d4d]">
                {visible.map((n) => (
                  <li key={notifKey(n)} className="flex items-start gap-2.5 px-4 py-3">
                    <ClipboardList size={15} className="mt-0.5 flex-shrink-0 text-blue-500" aria-hidden="true" />
                    <Link
                      href={detailHref}
                      onClick={() => setOpen(false)}
                      className="min-w-0 flex-1"
                    >
                      <p className="text-sm text-slate-800 dark:text-slate-100">
                        Nueva orden informal <span className="font-semibold">{n.tipoOrden}</span> ·{' '}
                        <span className="font-mono">{n.numeroParte}</span>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {n.clienteNombre ?? '—'} · {n.plantaNombre ?? '—'}
                        {n.solicitanteNombre ? ` · ${n.solicitanteNombre}` : ''}
                      </p>
                      {n.fechaCreado && (
                        <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{timeAgo(n.fechaCreado)}</p>
                      )}
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDismiss(n)}
                      aria-label="Descartar notificación"
                      className="-mr-1 mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
                    >
                      <X size={13} aria-hidden="true" />
                    </button>
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
