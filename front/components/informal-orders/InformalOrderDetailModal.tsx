'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { InformalOrderRow } from '@/shared/types/informalOrder'
import { EstadoReporteBadge, InspectoresCell, TipoOrdenBadge } from './InformalOrdersTable'

// ─── Types ────────────────────────────────────────────────────────────────────

interface InformalOrderDetailModalProps {
  orden: InformalOrderRow
  onClose: () => void
}

// ─── Main component ────────────────────────────────────────────────────────────
// Modal de solo lectura para ver el detalle completo de una orden informal.
// Mirror del chrome visual de OrderDetailModal (Carga de Trabajo): mismo overlay,
// tarjeta, header y secciones — pero sin ninguna acción de mutación.

export function InformalOrderDetailModal({ orden, onClose }: InformalOrderDetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Las incidencias se guardan como una sola cadena separada por comas
  // ("inc1, inc2, ..."); se parsean para mostrarlas como chips individuales.
  const incidencias = (orden.incidentes ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

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

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle de la orden informal ${orden.ordenInformalId}`}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 px-3 py-4 sm:px-4 sm:py-8 backdrop-blur-sm animate-fade-in"
      onClick={handleOverlayClick}
    >
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#25395f] dark:bg-[#0c1829] shadow-2xl animate-scale-in sm:max-h-[90vh]">

        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 dark:border-[#1a2d4d] px-4 py-3.5 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Orden informal #{orden.ordenInformalId}
              </h2>
              <TipoOrdenBadge tipo={orden.tipoOrden} />
            </div>
            <p className="text-sm text-slate-400">
              {orden.clienteNombre ?? '—'}
              <span className="mx-1.5 text-slate-600">·</span>
              {orden.plantaNombre ?? '—'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 flex-shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white"
            aria-label="Cerrar modal"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-0 divide-y divide-slate-200 overflow-y-auto scrollbar-thin dark:divide-[#1a2d4d]">

          {/* Sección 1 — Datos de la orden */}
          <section className="px-4 py-4 sm:px-6 sm:py-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Datos de la orden
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <dt className="text-xs text-slate-500">Tipo</dt>
                <dd className="text-sm text-slate-800 dark:text-slate-200">
                  {orden.tipoOrden === 'OV' ? 'Orden de venta (OV)' : 'Orden de acción (OA)'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Cliente</dt>
                <dd className="text-sm text-slate-800 dark:text-slate-200">{orden.clienteNombre ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Planta</dt>
                <dd className="text-sm text-slate-800 dark:text-slate-200">{orden.plantaNombre ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Solicitante</dt>
                <dd className="text-sm text-slate-800 dark:text-slate-200">{orden.solicitanteNombre ?? '—'}</dd>
              </div>
            </dl>
          </section>

          {/* Sección 2 — Ítem / números de parte */}
          <section className="px-4 py-4 sm:px-6 sm:py-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Ítem / números de parte
            </h3>
            <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 dark:border-[#1a2d4d] dark:bg-[#0a1628] px-3 py-3">
              <div>
                <dt className="text-xs text-slate-500">No. de parte</dt>
                {/* Se muestra tal cual fue capturado — puede contener varios números
                    de parte separados por espacios; no se separa/parsea aquí. */}
                <dd className="whitespace-pre-wrap break-words font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {orden.numeroParte}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Nombre de parte</dt>
                <dd className="text-sm text-slate-800 dark:text-slate-200">{orden.nombreParte ?? '—'}</dd>
              </div>
            </div>
          </section>

          {/* Sección — Incidencias */}
          <section className="px-4 py-4 sm:px-6 sm:py-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Incidencias
            </h3>
            {incidencias.length === 0 ? (
              <p className="text-sm text-slate-500">Sin incidencias</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {incidencias.map((inc, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400"
                  >
                    {inc}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Sección 3 — Inspectores asignados */}
          <section className="px-4 py-4 sm:px-6 sm:py-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Inspectores asignados
            </h3>
            <InspectoresCell inspectores={orden.inspectores} />
          </section>

          {/* Sección 4 — Reporte */}
          <section className="px-4 py-4 sm:px-6 sm:py-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Reporte
            </h3>
            <EstadoReporteBadge estado={orden.estadoReporte} />
          </section>

        </div>
      </div>
    </div>
  )
}
