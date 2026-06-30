'use client'

import { useEffect, useState } from 'react'
import { ClipboardCheck, Download, Loader2, X } from 'lucide-react'
import type { ReporteDetalleData } from '@/back/services/reporteDetalleService'
import { getReporteDetalleAction } from '@/app/actions/get-reporte-detalle'
import { ReporteDetalleResumen, ReporteEstadoBadge } from './ReporteDetalleResumen'

interface ReporteDetalleModalProps {
  /** ID del reporte a mostrar; `null` mantiene el modal cerrado. */
  reporteId: string | null
  onClose: () => void
}

export function ReporteDetalleModal({ reporteId, onClose }: ReporteDetalleModalProps) {
  const [reporte, setReporte] = useState<ReporteDetalleData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!reporteId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setReporte(null)

    getReporteDetalleAction(reporteId)
      .then((res) => {
        if (cancelled) return
        if (res.ok) setReporte(res.reporte)
        else setError(res.error)
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar el detalle del reporte.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reporteId])

  // Cerrar con Escape
  useEffect(() => {
    if (!reporteId) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reporteId, onClose])

  if (!reporteId) return null

  function handleDownload() {
    if (!reporteId) return
    const url = `/api/capturacion/reportes/${encodeURIComponent(reporteId)}/excel`
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-${reporteId}.xlsx`
    a.click()
  }

  /** Subtitle: "Cliente · Planta" when loaded, fallback identifier while loading */
  const subtitle = reporte
    ? `${reporte.cliente} · ${reporte.planta}`
    : reporteId
      ? `ID: ${reporteId}`
      : null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reporte-detalle-titulo"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-6 backdrop-blur-sm animate-fade-in sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Container: bounded height; body scrolls, header/footer stay fixed */}
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-[#F5F5F7] shadow-2xl dark:border-[#25395f] dark:bg-[#070e1a] animate-scale-in">

        {/* Fixed header — reference style: blue icon box + large title + grey subtitle + badge + ✕ */}
        <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 dark:border-[#25395f] dark:bg-[#0c1829]">
          <div className="flex min-w-0 items-start gap-3">
            {/* Icon in rounded blue box */}
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
              aria-hidden="true"
            >
              <ClipboardCheck size={20} />
            </div>

            {/* Title block */}
            <div className="min-w-0">
              <h2
                id="reporte-detalle-titulo"
                className="truncate text-lg font-bold leading-tight text-slate-900 dark:text-white"
              >
                {reporte ? reporte.consecutiveNumber : 'Detalle del reporte'}
              </h2>
              {subtitle && (
                <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                  {subtitle}
                </p>
              )}
              {reporte && (
                <div className="mt-1.5">
                  <ReporteEstadoBadge status={reporte.status} />
                </div>
              )}
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="mt-0.5 flex-shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500">
              <Loader2 size={28} className="animate-spin" aria-hidden="true" />
              <p className="text-sm">Cargando detalle…</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
              <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
              <button type="button" onClick={onClose} className="text-sm text-blue-500 hover:underline">Cerrar</button>
            </div>
          )}

          {!loading && !error && reporte && <ReporteDetalleResumen reporte={reporte} />}
        </div>

        {/* Fixed footer */}
        <div className="flex flex-shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3.5 dark:border-[#25395f] dark:bg-[#0c1829]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-[#31476f] dark:text-slate-300 dark:hover:bg-white/10"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!reporte}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={14} aria-hidden="true" />
            Descargar Excel
          </button>
        </div>
      </div>
    </div>
  )
}
