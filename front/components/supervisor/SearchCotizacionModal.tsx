'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2, X } from 'lucide-react'
import {
  importCotizacionAction,
  type ImportCotizacionState,
} from '@/app/actions/import-cotizacion'
import type { OrderWorkload } from '@/back/services/cargaDeTrabajoService'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
  onOrderFound: (order: OrderWorkload) => void
}

// ─── Submit button ────────────────────────────────────────────────────────────

function SearchSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {pending ? 'Buscando...' : 'Buscar'}
    </button>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function SearchCotizacionModal({ onClose, onOrderFound }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [state, action, pending] = useActionState<ImportCotizacionState, FormData>(
    importCotizacionAction,
    undefined,
  )

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Escape key — do not close while pending
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !pending) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, pending])

  // Propagate success upward
  useEffect(() => {
    if (state?.ok === true) {
      onOrderFound(state.order)
    }
  }, [state, onOrderFound])

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current && !pending) onClose()
  }

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-cotizacion-titulo"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <form
        action={action}
        className="w-full max-w-sm overflow-hidden rounded-xl border border-[#25395f] bg-[#111a30] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#25395f] px-5 py-4">
          <h3 id="search-cotizacion-titulo" className="text-sm font-semibold text-white">
            Buscar cotización
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-5 py-5">
          <p className="text-sm text-slate-400">
            Ingresa el número de orden para importar sus cotizaciones desde Quality Bolca.
          </p>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-300">Número de orden</span>
            <input
              type="text"
              name="orden"
              required
              placeholder="Ej. OA-1000"
              autoFocus
              className="rounded-md border border-[#31476f] bg-[#0c1426] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
            />
          </label>

          {state && !state.ok && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {state.error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[#25395f] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-md border border-[#31476f] px-4 py-2 text-sm text-slate-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <SearchSubmitButton />
        </div>
      </form>
    </div>
  )
}
