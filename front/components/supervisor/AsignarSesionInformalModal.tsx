'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import { asignarSesionInformalAction, type AssignInformalSessionState } from '@/app/actions/assign-informal-session'
import type { InformalOrderRow } from '@/shared/types/informalOrder'
import type { InspectorOption } from '@/back/services/cargaDeTrabajoService'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AsignarSesionInformalModalProps {
  order: InformalOrderRow
  inspectors: InspectorOption[]
  onClose: () => void
  onSuccess: () => void
}

// ─── Submit button ─────────────────────────────────────────────────────────────

function SubmitButton({ disabled = false }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
    >
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {pending ? 'Asignando...' : 'Asignar'}
    </button>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function AsignarSesionInformalModal({ order, inspectors, onClose, onSuccess }: AsignarSesionInformalModalProps) {
  const [state, dispatch] = useActionState<AssignInformalSessionState, FormData>(asignarSesionInformalAction, undefined)
  const [inspectorIds, setInspectorIds] = useState<string[]>([])

  const relevantInspectors = useMemo(
    () => (order.plantaId != null ? inspectors.filter((i) => i.plantIds.includes(order.plantaId!)) : inspectors),
    [inspectors, order.plantaId],
  )

  function toggleInspector(id: string) {
    setInspectorIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  useEffect(() => {
    if (state?.ok === true) {
      onSuccess()
    }
  }, [state])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="asignar-sesion-informal-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-[#0c1829] border border-slate-100 dark:border-[#1a2d4d] rounded-xl shadow-2xl w-full max-w-sm mx-4 animate-scale-in max-h-[90vh] overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-200 dark:border-[#1a2d4d] flex-shrink-0">
          <h2 id="asignar-sesion-informal-titulo" className="text-blue-950 dark:text-white font-semibold text-base">
            Asignar inspectores
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded text-blue-600 dark:text-slate-400 hover:text-blue-950 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <form action={dispatch} className="flex flex-col flex-1 min-h-0">
          <input type="hidden" name="itemId" value={String(order.itemOrdenInformalId)} />

          <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-mono text-slate-800 dark:text-slate-200">{order.numeroParte}</span>
              {order.nombreParte && <span> · {order.nombreParte}</span>}
            </p>

            {state?.ok === false && (
              <div role="alert" className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                <p className="text-red-400 text-sm">{state.error}</p>
              </div>
            )}

            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1 text-xs font-medium text-black dark:text-slate-400">
                Inspectores
              </legend>
              {relevantInspectors.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No hay inspectores disponibles para esta planta.
                </p>
              ) : (
                <div className="max-h-56 overflow-y-auto rounded-lg border border-blue-200 dark:border-[#1a2d4d] bg-white dark:bg-[#0c1829] p-2 flex flex-col gap-1">
                  {relevantInspectors.map((i) => {
                    const id = String(i.empleadoId)
                    return (
                      <label
                        key={i.empleadoId}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          name="inspectorIds"
                          value={id}
                          checked={inspectorIds.includes(id)}
                          onChange={() => toggleInspector(id)}
                          className="h-4 w-4 flex-shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500/40"
                        />
                        <span className="flex-1 truncate">{i.name}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </fieldset>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-blue-200 dark:border-[#1a2d4d] flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-blue-200 dark:border-[#1a2d4d] text-blue-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors"
            >
              Cancelar
            </button>
            <SubmitButton disabled={inspectorIds.length === 0} />
          </div>
        </form>

      </div>
    </div>
  )
}
