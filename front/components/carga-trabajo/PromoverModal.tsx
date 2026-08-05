'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2, Search, UserCheck, X } from 'lucide-react'
import type { InformalOrderRow } from '@/shared/types/informalOrder'
import { getOrdenesInformalesParaPromoverAction } from '@/app/actions/promover-orden'
import type { PromoverOrdenState } from '@/app/actions/promover-orden'
import { TipoOrdenBadge } from '@/front/components/informal-orders/InformalOrdersTable'

// ─── Helpers ────────────────────────────────────────────────────────────────

// Tiempo relativo corto ("hace 5 min", "hace 2 h", "hace 3 d") — mismo idioma
// que `InformalOrdersBell.tsx#timeAgo`, duplicado aquí por ser un helper
// puntual sin util compartido en `front/lib/` todavía.
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

/** Item formal destino de la promoción (item_orden_id + su número de parte). */
export interface PromoverTargetItem {
  id: number
  partNumber: string
}

// ─── Row submit button ──────────────────────────────────────────────────────

function PromoverRowButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 px-2.5 py-1.5 text-xs font-medium text-blue-400 transition-colors hover:border-blue-400 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
      {pending ? 'Promoviendo...' : 'Promover aquí'}
    </button>
  )
}

// ─── Row ────────────────────────────────────────────────────────────────────

interface PromoverRowProps {
  informal: InformalOrderRow
  /** item_orden_id formal destino — fijo (el item desde el que se abrió el modal). */
  targetItemId: number
  action: (formData: FormData) => void
}

function PromoverRow({ informal, targetItemId, action }: PromoverRowProps) {
  return (
    <form
      action={action}
      className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 dark:border-[#1a2d4d] dark:bg-[#0a1628] sm:flex-row sm:items-center sm:justify-between sm:gap-3"
    >
      <input type="hidden" name="itemOrdenInformalId" value={String(informal.itemOrdenInformalId)} />
      <input type="hidden" name="itemOrdenId" value={String(targetItemId)} />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <TipoOrdenBadge tipo={informal.tipoOrden} />
          <span className="truncate font-mono text-sm font-medium text-slate-800 dark:text-slate-200">
            {informal.numeroParte}
          </span>
        </div>
        {informal.nombreParte && (
          <span className="truncate text-xs text-slate-500 dark:text-slate-400">{informal.nombreParte}</span>
        )}
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {informal.clienteNombre ?? '—'} <span className="mx-1 text-slate-400 dark:text-slate-600">·</span>{' '}
          {informal.plantaNombre ?? '—'}
        </span>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 dark:text-slate-500">
          {informal.solicitanteNombre && <span>Solicitó: {informal.solicitanteNombre}</span>}
          {informal.fechaCreado && <span>{timeAgo(informal.fechaCreado)}</span>}
          {informal.inspectores.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <UserCheck size={11} className="flex-shrink-0" aria-hidden="true" />
              {informal.inspectores.map((i) => i.name).join(', ')}
            </span>
          )}
        </div>
      </div>

      <PromoverRowButton />
    </form>
  )
}

// ─── Modal ──────────────────────────────────────────────────────────────────

interface PromoverModalProps {
  /** Item formal destino (item_orden_id + parte) que recibirá los reportes. */
  targetItem: PromoverTargetItem
  state: PromoverOrdenState
  action: (formData: FormData) => void
  onClose: () => void
}

export function PromoverModal({ targetItem, state, action, onClose }: PromoverModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [informalOrders, setInformalOrders] = useState<InformalOrderRow[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getOrdenesInformalesParaPromoverAction()
      .then((rows) => {
        if (!cancelled) setInformalOrders(rows)
      })
      .catch(() => {
        if (!cancelled) setLoadError('No se pudieron cargar las órdenes informales.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose()
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const filtered = informalOrders.filter((o) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      (o.clienteNombre ?? '').toLowerCase().includes(q) ||
      (o.plantaNombre ?? '').toLowerCase().includes(q) ||
      o.numeroParte.toLowerCase().includes(q) ||
      (o.nombreParte ?? '').toLowerCase().includes(q) ||
      (o.solicitanteNombre ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="promover-modal-titulo"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm animate-fade-in"
      onClick={handleOverlayClick}
    >
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#25395f] dark:bg-[#111a30] shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 dark:border-[#25395f] px-5 py-4">
          <h3 id="promover-modal-titulo" className="text-sm font-semibold text-slate-900 dark:text-white">
            Promover al item{' '}
            <span className="font-mono text-violet-500 dark:text-violet-400">{targetItem.partNumber}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white"
            aria-label="Cerrar"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Selecciona la orden informal cuyos reportes diarios pasarán a este item formal.
          </p>

          {informalOrders.length > 0 && (
            <div className="relative shrink-0">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por cliente, planta, parte o solicitante…"
                aria-label="Buscar órdenes informales"
                className="w-full rounded-lg border border-slate-200 bg-white dark:border-[#1a2d4d] dark:bg-[#0c1829] pl-8 pr-3 py-1.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
              />
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Cargando órdenes informales…
            </div>
          ) : loadError ? (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {loadError}
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              {informalOrders.length === 0
                ? 'No hay órdenes informales disponibles para promover.'
                : `Sin resultados para "${search.trim()}"`}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((informal) => (
                <PromoverRow
                  key={informal.itemOrdenInformalId}
                  informal={informal}
                  targetItemId={targetItem.id}
                  action={action}
                />
              ))}
            </div>
          )}

          {state && !state.ok && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {state.error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
