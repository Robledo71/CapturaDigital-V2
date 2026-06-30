'use client'

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  LockKeyhole,
  LockKeyholeOpen,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
} from 'lucide-react'
import type { CotizacionRow } from '@/back/services/cotizacionesService'
import {
  desbloquearCotizacionAction,
  type DesbloquearCotizacionState,
} from '@/app/actions/desbloquear-cotizacion'
import {
  bloquearTodasCotizacionesAction,
  type BloquearTodasState,
} from '@/app/actions/bloquear-todas-cotizaciones'

const PAGE_SIZE = 10

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  cotizaciones: CotizacionRow[]
  canBlockAll: boolean
}

interface ConfirmTarget {
  id: number
  consecutivo: string
  /** true → the confirmed action is Desbloquear; false → Bloquear */
  desbloquear: boolean
}

// ─── useModal helper ──────────────────────────────────────────────────────────
// Handles body-scroll lock, Escape key, and overlay click-outside.
// Call this only inside a mounted modal component (always active).

function useModal(onClose: () => void, blockClose = false) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !blockClose) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, blockClose])

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current && !blockClose) onClose()
  }

  return { overlayRef, handleOverlayClick }
}

// ─── ConfirmModal (individual per row) ────────────────────────────────────────

interface ConfirmModalProps {
  target: ConfirmTarget
  onCancel: () => void
  onConfirm: () => void
  pending: boolean
}

function ConfirmModal({ target, onCancel, onConfirm, pending }: ConfirmModalProps) {
  const { overlayRef, handleOverlayClick } = useModal(onCancel, pending)
  const accion = target.desbloquear ? 'desbloquear' : 'bloquear'
  const ActionLabel = target.desbloquear ? 'Desbloquear' : 'Bloquear'

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-individual-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div className="w-full max-w-sm rounded-xl border border-slate-200 dark:border-[#1a2d4d] bg-white dark:bg-[#0c1829] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1a2d4d] px-5 py-4">
          <h3
            id="confirm-individual-titulo"
            className="text-sm font-semibold text-slate-900 dark:text-white"
          >
            Confirmar acción
          </h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            ¿Seguro que quieres{' '}
            <span className="font-semibold">{accion}</span> la cotización{' '}
            <span className="font-mono font-semibold text-slate-900 dark:text-white">
              {target.consecutivo}
            </span>
            ?
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-[#1a2d4d] px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-lg border border-slate-200 dark:border-[#1a2d4d] px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              target.desbloquear
                ? 'bg-green-600 hover:bg-green-500'
                : 'bg-red-600 hover:bg-red-500'
            }`}
          >
            {pending && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
            {pending ? 'Procesando...' : ActionLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ConfirmBlockAllModal ─────────────────────────────────────────────────────

interface ConfirmBlockAllModalProps {
  onCancel: () => void
  onConfirm: () => void
  pending: boolean
  feedback: string | null
  error: string | null
}

function ConfirmBlockAllModal({
  onCancel,
  onConfirm,
  pending,
  feedback,
  error,
}: ConfirmBlockAllModalProps) {
  const { overlayRef, handleOverlayClick } = useModal(onCancel, pending)

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-bloquear-todas-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div className="w-full max-w-sm rounded-xl border border-slate-200 dark:border-[#1a2d4d] bg-white dark:bg-[#0c1829] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1a2d4d] px-5 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" aria-hidden="true" />
            <h3
              id="confirm-bloquear-todas-titulo"
              className="text-sm font-semibold text-slate-900 dark:text-white"
            >
              Bloquear todas
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3 px-5 py-5">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Esta acción bloqueará{' '}
            <span className="font-semibold text-slate-900 dark:text-white">todas</span> las
            cotizaciones actualmente desbloqueadas. Los clientes perderán acceso de inmediato.
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            Esta operación aplica en lote y no puede deshacerse de forma masiva.
          </p>
          {feedback && (
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">{feedback}</p>
          )}
          {error && (
            <p className="text-xs text-red-500 dark:text-red-400 font-medium">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-[#1a2d4d] px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-lg border border-slate-200 dark:border-[#1a2d4d] px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending || feedback !== null}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
            {pending ? 'Bloqueando...' : 'Bloquear todas'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ToggleButton ─────────────────────────────────────────────────────────────

interface ToggleButtonProps {
  cotizacion: CotizacionRow
  onToggle: (id: number, value: boolean) => void
  onRequestConfirm: (target: ConfirmTarget) => void
  /** Called with a trigger function so the parent can fire the submit after confirming */
  registerSubmit: (id: number, fn: () => void) => void
}

function ToggleButton({ cotizacion, onToggle, onRequestConfirm, registerSubmit }: ToggleButtonProps) {
  const [state, formAction] = useActionState<DesbloquearCotizacionState, FormData>(
    desbloquearCotizacionAction,
    undefined,
  )
  const [pending, setPending] = useState(false)
  // Track which state we've already reacted to so the effect runs once per real change.
  // Without this, `cotizacion.desbloqueado` flipping inside onToggle re-fires the effect
  // and toggles the value again → infinite loop.
  const handledStateRef = useRef<DesbloquearCotizacionState>(undefined)
  const formRef = useRef<HTMLFormElement>(null)

  // Register our submit function with the parent so ConfirmModal can call it
  useEffect(() => {
    registerSubmit(cotizacion.id, () => {
      if (formRef.current) {
        setPending(true)
        formRef.current.requestSubmit()
      }
    })
  }, [cotizacion.id, registerSubmit])

  useEffect(() => {
    if (state === handledStateRef.current) return
    handledStateRef.current = state
    if (state?.ok) {
      setPending(false)
      onToggle(cotizacion.id, !cotizacion.desbloqueado)
    } else if (state && !state.ok) {
      setPending(false)
    }
  }, [state, cotizacion.id, cotizacion.desbloqueado, onToggle])

  function handleButtonClick() {
    onRequestConfirm({
      id: cotizacion.id,
      consecutivo: cotizacion.consecutiveNumber ?? String(cotizacion.id),
      desbloquear: !cotizacion.desbloqueado,
    })
  }

  return (
    <div>
      {/* Hidden form — still driven by useActionState; submit triggered programmatically after confirm */}
      <form
        ref={formRef}
        action={(fd) => { formAction(fd) }}
        className="contents"
        aria-hidden="true"
      >
        <input type="hidden" name="cotizacionId" value={String(cotizacion.id)} />
        <input type="hidden" name="desbloqueado" value={String(!cotizacion.desbloqueado)} />
      </form>
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={pending}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
          cotizacion.desbloqueado
            ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20'
            : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300 dark:hover:bg-green-500/20'
        }`}
      >
        {pending ? (
          <Loader2 size={13} className="animate-spin" />
        ) : cotizacion.desbloqueado ? (
          <LockKeyhole size={13} />
        ) : (
          <LockKeyholeOpen size={13} />
        )}
        {cotizacion.desbloqueado ? 'Bloquear' : 'Desbloquear'}
      </button>
      {state && !state.ok && (
        <p className="mt-1 text-xs text-red-400">{state.error}</p>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DesbloquearCotizacionesClient({ cotizaciones: initial, canBlockAll }: Props) {
  const [cotizaciones, setCotizaciones] = useState(initial)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Map of cotizacion.id → programmatic submit fn registered by each ToggleButton
  const submitRefs = useRef<Map<number, () => void>>(new Map())

  const registerSubmit = useCallback((id: number, fn: () => void) => {
    submitRefs.current.set(id, fn)
  }, [])

  // ─── Individual confirm state ─────────────────────────────────────────────

  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null)
  const [confirmPending, setConfirmPending] = useState(false)

  function handleRequestConfirm(target: ConfirmTarget) {
    setConfirmTarget(target)
    setConfirmPending(false)
  }

  function handleConfirmCancel() {
    if (!confirmPending) setConfirmTarget(null)
  }

  function handleConfirmProceed() {
    if (!confirmTarget) return
    const submit = submitRefs.current.get(confirmTarget.id)
    if (submit) submit()
    setConfirmTarget(null)
    setConfirmPending(false)
  }

  // ─── Toggle handler ───────────────────────────────────────────────────────

  function handleToggle(id: number, newValue: boolean) {
    setCotizaciones((prev) =>
      prev.map((c) => (c.id === id ? { ...c, desbloqueado: newValue } : c)),
    )
  }

  // ─── Bloquear todas ───────────────────────────────────────────────────────

  const [showBlockAllModal, setShowBlockAllModal] = useState(false)
  const [blockAllState, blockAllDispatch, blockAllPending] = useActionState<BloquearTodasState, FormData>(
    bloquearTodasCotizacionesAction,
    undefined,
  )
  const [blockAllFeedback, setBlockAllFeedback] = useState<string | null>(null)
  const [blockAllError, setBlockAllError] = useState<string | null>(null)
  const handledBlockAllRef = useRef<BloquearTodasState>(undefined)

  useEffect(() => {
    if (blockAllState === handledBlockAllRef.current) return
    handledBlockAllRef.current = blockAllState
    if (blockAllState?.ok === true) {
      const count = blockAllState.count
      setBlockAllFeedback(`Se bloquearon ${count} cotización${count !== 1 ? 'es' : ''}.`)
      setBlockAllError(null)
      setCotizaciones((prev) => prev.map((c) => ({ ...c, desbloqueado: false })))
    } else if (blockAllState?.ok === false) {
      setBlockAllError(blockAllState.error)
      setBlockAllFeedback(null)
    }
  }, [blockAllState])

  // Auto-close block-all modal on success after brief feedback display
  useEffect(() => {
    if (!blockAllFeedback) return
    const timer = setTimeout(() => {
      setShowBlockAllModal(false)
      setBlockAllFeedback(null)
    }, 1800)
    return () => clearTimeout(timer)
  }, [blockAllFeedback])

  function handleBlockAllConfirm() {
    blockAllDispatch(new FormData())
  }

  // ─── Filtering & pagination ───────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return cotizaciones
    return cotizaciones.filter(
      (c) =>
        (c.consecutiveNumber ?? '').toLowerCase().includes(q) ||
        (c.orderConsecutive ?? '').toLowerCase().includes(q) ||
        (c.clientName ?? '').toLowerCase().includes(q) ||
        (c.clientEmail ?? '').toLowerCase().includes(q),
    )
  }, [cotizaciones, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Desbloquear Cotizaciones</h1>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
            Gestiona el acceso del cliente a sus cotizaciones.
          </p>
        </div>
        {canBlockAll && (
          <button
            type="button"
            onClick={() => {
              setBlockAllFeedback(null)
              setBlockAllError(null)
              setShowBlockAllModal(true)
            }}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-300 transition-colors hover:bg-red-100 dark:hover:bg-red-500/20 sm:self-auto"
          >
            <LockKeyhole size={13} />
            Bloquear todas
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="shrink-0 relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por cotización, orden o cliente..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 dark:border-[#1a2d4d] bg-white dark:bg-[#0c1829] pl-9 pr-4 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
        />
      </div>

      {/* Table */}
      <div className="shrink-0 rounded-xl border border-slate-200 dark:border-[#1a2d4d] bg-white dark:bg-[#0c1829] overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            {search ? 'Sin resultados para la búsqueda.' : 'No hay cotizaciones registradas.'}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#1a2d4d]">
                    {['Cotización', 'Orden', 'Cliente', 'Email', 'Estado', 'Acceso', 'Acción'].map(
                      (col, i) => (
                        <th
                          key={col}
                          className={`px-4 py-3 text-xs font-bold text-black dark:text-white ${
                            i < 5 ? 'text-left' : 'text-center'
                          }`}
                        >
                          {col}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-slate-100 dark:border-[#1a2d4d]/60 hover:bg-blue-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {c.consecutiveNumber ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {c.orderConsecutive ?? '—'}
                      </td>
                      <td
                        className="px-4 py-3 text-sm text-slate-900 dark:text-white max-w-[160px] truncate"
                        title={c.clientName ?? ''}
                      >
                        {c.clientName ?? '—'}
                      </td>
                      <td
                        className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[160px] truncate"
                        title={c.clientEmail ?? ''}
                      >
                        {c.clientEmail ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {c.status ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
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
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ToggleButton
                          cotizacion={c}
                          onToggle={handleToggle}
                          onRequestConfirm={handleRequestConfirm}
                          registerSubmit={registerSubmit}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-[#1a2d4d] px-4 py-3">
              <p className="text-xs text-slate-500">
                {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
                {totalPages > 1 && ` · Página ${currentPage} de ${totalPages}`}
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 dark:border-[#1a2d4d] text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - currentPage) <= 1,
                    )
                    .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…')
                      acc.push(p)
                      return acc
                    }, [])
                    .map((p, i) =>
                      p === '…' ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-xs text-slate-600">
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPage(p as number)}
                          className={`inline-flex h-7 min-w-[28px] items-center justify-center rounded-md border px-2 text-xs transition-colors ${
                            currentPage === p
                              ? 'border-blue-500 bg-blue-600 text-white'
                              : 'border-slate-200 dark:border-[#1a2d4d] text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {p}
                        </button>
                      ),
                    )}
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 dark:border-[#1a2d4d] text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Individual confirmation modal */}
      {confirmTarget && (
        <ConfirmModal
          target={confirmTarget}
          onCancel={handleConfirmCancel}
          onConfirm={handleConfirmProceed}
          pending={confirmPending}
        />
      )}

      {/* Bloquear todas confirmation modal */}
      {showBlockAllModal && (
        <ConfirmBlockAllModal
          onCancel={() => {
            if (!blockAllPending) setShowBlockAllModal(false)
          }}
          onConfirm={handleBlockAllConfirm}
          pending={blockAllPending}
          feedback={blockAllFeedback}
          error={blockAllError}
        />
      )}
    </div>
  )
}
