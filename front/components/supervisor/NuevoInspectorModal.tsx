'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import {
  crearInspectorAction,
  getNextInspectorCodeAction,
  type CreateInspectorState,
} from '@/app/actions/create-inspector'
import type { InspectorRow } from '@/shared/types/inspector'
import type { PlantaRow } from '@/shared/types/planta'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NuevoInspectorModalProps {
  plantas: PlantaRow[]
  onClose: () => void
  onSuccess: (inspector: InspectorRow, generatedPassword: string) => void
}

interface FormValues {
  nombre_empleado: string
  apellido_paterno: string
  apellido_materno: string
}

const EMPTY_VALUES: FormValues = {
  nombre_empleado: '',
  apellido_paterno: '',
  apellido_materno: '',
}

// ─── Submit button ─────────────────────────────────────────────────────────────

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
    >
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {pending ? 'Creando...' : 'Crear inspector'}
    </button>
  )
}

// ─── Shared input classes ──────────────────────────────────────────────────────

const inputCls =
  'rounded-lg bg-white dark:bg-[#0c1829] border border-blue-200 dark:border-[#1a2d4d] text-slate-800 dark:text-slate-200 placeholder-slate-500 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors w-full'

// ─── Main component ────────────────────────────────────────────────────────────

export function NuevoInspectorModal({ plantas, onClose, onSuccess }: NuevoInspectorModalProps) {
  const [state, dispatch] = useActionState<CreateInspectorState, FormData>(crearInspectorAction, undefined)
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES)
  const [plantaIds, setPlantaIds] = useState<string[]>([])
  // Preview read-only del código autogenerado (INS-00x); null mientras carga.
  const [codigoPreview, setCodigoPreview] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getNextInspectorCodeAction().then((r) => {
      if (!cancelled) setCodigoPreview(r.codigo)
    })
    return () => {
      cancelled = true
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  function togglePlanta(id: string) {
    setPlantaIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  useEffect(() => {
    if (state?.ok === true) {
      onSuccess(state.inspector, state.generatedPassword)
    }
  }, [state])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nuevo-inspector-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-[#0c1829] border border-slate-100 dark:border-[#1a2d4d] rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-scale-in max-h-[90vh] overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-200 dark:border-[#1a2d4d] flex-shrink-0">
          <h2 id="nuevo-inspector-titulo" className="text-blue-950 dark:text-white font-semibold text-base">
            Nuevo inspector
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
          <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1">

            {/* Error general */}
            {state?.ok === false && (
              <div role="alert" className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                <p className="text-red-400 text-sm">{state.error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">

              {/* Nombre — col span 2 */}
              <div className="col-span-2 flex flex-col gap-1">
                <label htmlFor="nombre_empleado" className="text-xs font-medium text-black dark:text-slate-400">
                  Nombre(s)
                </label>
                <input
                  id="nombre_empleado"
                  name="nombre_empleado"
                  type="text"
                  autoComplete="off"
                  autoFocus
                  required
                  placeholder="Ej. Juan"
                  value={values.nombre_empleado}
                  onChange={handleChange}
                  className={inputCls}
                />
              </div>

              {/* Apellido paterno */}
              <div className="flex flex-col gap-1">
                <label htmlFor="apellido_paterno" className="text-xs font-medium text-black dark:text-slate-400">
                  Apellido paterno
                </label>
                <input
                  id="apellido_paterno"
                  name="apellido_paterno"
                  type="text"
                  autoComplete="off"
                  required
                  placeholder="Ej. Pérez"
                  value={values.apellido_paterno}
                  onChange={handleChange}
                  className={inputCls}
                />
              </div>

              {/* Apellido materno (opcional) */}
              <div className="flex flex-col gap-1">
                <label htmlFor="apellido_materno" className="text-xs font-medium text-black dark:text-slate-400">
                  Apellido materno <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  id="apellido_materno"
                  name="apellido_materno"
                  type="text"
                  autoComplete="off"
                  placeholder="Ej. García"
                  value={values.apellido_materno}
                  onChange={handleChange}
                  className={inputCls}
                />
              </div>

              {/* Código de empleado — autogenerado (INS-00x), solo lectura.
                  El backend vuelve a generarlo al crear; este campo es informativo. */}
              <div className="col-span-2 flex flex-col gap-1">
                <label htmlFor="codigo_empleado" className="text-xs font-medium text-black dark:text-slate-400">
                  Código de usuario <span className="text-slate-400 font-normal">(automático)</span>
                </label>
                <input
                  id="codigo_empleado"
                  type="text"
                  readOnly
                  aria-readonly="true"
                  tabIndex={-1}
                  value={codigoPreview ?? 'Generando…'}
                  className={`${inputCls} cursor-not-allowed bg-slate-50 dark:bg-[#0a1628] text-slate-500 dark:text-slate-400 font-mono`}
                />
              </div>

              {/* Plantas — selección múltiple */}
              <div className="col-span-2 flex flex-col gap-1 min-w-0">
                <fieldset className="flex flex-col gap-1 min-w-0">
                  <legend className="text-xs font-medium text-black dark:text-slate-400">
                    Plantas <span className="text-slate-400 font-normal">(opcional)</span>
                  </legend>
                  <div className="max-h-36 overflow-y-auto overflow-x-hidden rounded-lg border border-blue-200 dark:border-[#1a2d4d] bg-white dark:bg-[#0c1829] p-2 flex flex-col gap-1">
                    {plantas.length === 0 ? (
                      <p className="text-xs text-slate-500 px-1 py-1">No hay plantas disponibles</p>
                    ) : (
                      plantas.map((p) => {
                        const id = String(p.id)
                        return (
                          <label
                            key={p.id}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              name="plantaIds"
                              value={id}
                              checked={plantaIds.includes(id)}
                              onChange={() => togglePlanta(id)}
                              className="h-4 w-4 flex-shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500/40"
                            />
                            <span className="flex-1 min-w-0 truncate">{p.nombre}</span>
                          </label>
                        )
                      })
                    )}
                  </div>
                </fieldset>
              </div>

            </div>
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
            <SubmitButton />
          </div>
        </form>

      </div>
    </div>
  )
}
