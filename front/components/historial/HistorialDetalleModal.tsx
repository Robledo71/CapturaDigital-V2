'use client'

import { useEffect } from 'react'
import { X, ArrowRight } from 'lucide-react'
import type { EditHistoryRow } from '@/back/services/editHistoryService'

interface HistorialDetalleModalProps {
  registro: EditHistoryRow
  onClose: () => void
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const CAMPOS = [
  { key: 'ok', label: 'OK' },
  { key: 'ng', label: 'NG' },
  { key: 'scrap', label: 'Scrap' },
  { key: 'recovered', label: 'Recuperadas' },
] as const

export function HistorialDetalleModal({ registro, onClose }: HistorialDetalleModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const { before, after } = registro.valores
  const sinDetalle = CAMPOS.every(({ key }) => before[key] === null && after[key] === null)

  // Comparativo de incidencias por nombre (unión de antes + después).
  const incBeforeMap = new Map(registro.incidencias.before.map((i) => [i.name, i.pieces]))
  const incAfterMap = new Map(registro.incidencias.after.map((i) => [i.name, i.pieces]))
  const incNames = Array.from(new Set([...incBeforeMap.keys(), ...incAfterMap.keys()]))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle del cambio en el reporte #${registro.dailyReportConsecutive}`}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white dark:bg-[#0c1829] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-700 px-5 py-4 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              Cambio en reporte <span className="font-mono text-blue-600 dark:text-blue-400">#{registro.dailyReportConsecutive}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ítem {registro.reportItemId ?? '—'} · {registro.usuario} · {formatFecha(registro.createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a2d4d] flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {/* Motivo */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Motivo de la edición
            </p>
            <p className="rounded-lg bg-slate-50 dark:bg-[#0f2138] px-3 py-2 text-sm text-slate-700 dark:text-slate-200">
              {registro.motivo}
            </p>
          </div>

          {/* Comparativo de piezas */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Qué se modificó (antes → después)
            </p>

            {sinDetalle ? (
              <p className="rounded-lg bg-slate-50 dark:bg-[#0f2138] px-3 py-3 text-sm text-slate-500 dark:text-slate-400">
                Este registro es anterior a la captura de detalle, no hay valores guardados.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#0f2138] text-xs text-slate-500 dark:text-slate-400">
                      <th className="px-3 py-2 text-left font-semibold">Pieza</th>
                      <th className="px-3 py-2 text-right font-semibold">Antes</th>
                      <th className="px-3 py-2 text-center font-semibold"></th>
                      <th className="px-3 py-2 text-right font-semibold">Después</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CAMPOS.map(({ key, label }) => {
                      const antes = before[key]
                      const despues = after[key]
                      const cambio = antes !== despues
                      return (
                        <tr
                          key={key}
                          className={`border-t border-slate-100 dark:border-slate-800 ${
                            cambio ? 'bg-blue-500/5' : ''
                          }`}
                        >
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{label}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">
                            {antes ?? '—'}
                          </td>
                          <td className="px-3 py-2 text-center text-slate-400">
                            {cambio && <ArrowRight size={13} className="inline" aria-hidden="true" />}
                          </td>
                          <td
                            className={`px-3 py-2 text-right tabular-nums font-medium ${
                              cambio ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {despues ?? '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Comparativo de incidencias */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Incidencias (antes → después)
            </p>
            {incNames.length === 0 ? (
              <p className="rounded-lg bg-slate-50 dark:bg-[#0f2138] px-3 py-3 text-sm text-slate-500 dark:text-slate-400">
                Sin incidencias en esta edición.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#0f2138] text-xs text-slate-500 dark:text-slate-400">
                      <th className="px-3 py-2 text-left font-semibold">Incidencia</th>
                      <th className="px-3 py-2 text-right font-semibold">Antes</th>
                      <th className="px-3 py-2 text-center font-semibold"></th>
                      <th className="px-3 py-2 text-right font-semibold">Después</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incNames.map((name) => {
                      const antes = incBeforeMap.has(name) ? incBeforeMap.get(name) ?? null : null
                      const despues = incAfterMap.has(name) ? incAfterMap.get(name) ?? null : null
                      const cambio = antes !== despues
                      return (
                        <tr
                          key={name}
                          className={`border-t border-slate-100 dark:border-slate-800 ${
                            cambio ? 'bg-blue-500/5' : ''
                          }`}
                        >
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{name}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">
                            {antes ?? '—'}
                          </td>
                          <td className="px-3 py-2 text-center text-slate-400">
                            {cambio && <ArrowRight size={13} className="inline" aria-hidden="true" />}
                          </td>
                          <td
                            className={`px-3 py-2 text-right tabular-nums font-medium ${
                              cambio ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {despues ?? '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-200 dark:border-slate-700 px-5 py-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1a2d4d]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
