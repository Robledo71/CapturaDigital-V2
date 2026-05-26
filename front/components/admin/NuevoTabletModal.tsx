'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import { createTablet } from '@/app/actions/create-tablet'
import type { TabletRow } from '@/shared/types/tablet'
import type { PlantaRow } from '@/shared/types/planta'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NuevoTabletModalProps {
  plantas: PlantaRow[]
  onClose: () => void
  onSuccess: (tablet: TabletRow) => void
}

interface FormValues {
  modelo: string
  serie: string
  codigotablet: string
  alias: string
  plantaId: string
  notes: string
}

const EMPTY_VALUES: FormValues = {
  modelo: '',
  serie: '',
  codigotablet: '',
  alias: '',
  plantaId: '',
  notes: '',
}

// ─── Submit button ─────────────────────────────────────────────────────────────

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-blue-950 dark:text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
    >
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {pending ? 'Registrando...' : 'Registrar tablet'}
    </button>
  )
}

// ─── Shared input classes ──────────────────────────────────────────────────────

const inputCls =
  'rounded-lg bg-white dark:bg-[#0c1829] border border-blue-200 dark:border-[#1a2d4d] text-slate-200 placeholder-slate-500 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors w-full'

// ─── Main component ────────────────────────────────────────────────────────────

export function NuevoTabletModal({ plantas, onClose, onSuccess }: NuevoTabletModalProps) {
  const [state, dispatch] = useActionState(createTablet, undefined)
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    setValues((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  useEffect(() => {
    if (state?.success === true && state.tablet) {
      onSuccess(state.tablet)
      onClose()
    }
  }, [state])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-nueva-tablet-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="bg-white dark:bg-[#0c1829] border border-slate-100 dark:border-[#1a2d4d] rounded-xl shadow-2xl w-full max-w-lg mx-4">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-200 dark:border-[#1a2d4d]">
          <h2 id="modal-nueva-tablet-titulo" className="text-blue-950 dark:text-white font-semibold text-base">
            Registrar tablet
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded text-blue-600 dark:text-slate-400 hover:text-blue-950 dark:text-white hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <form action={dispatch}>
          <div className="p-6 flex flex-col gap-4">

            {/* Error general */}
            {state?.errors?.general && (
              <div
                role="alert"
                className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3"
              >
                <p className="text-red-400 text-sm">{state.errors.general[0]}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">

              {/* Código tablet — col span 2 */}
              <div className="col-span-2 flex flex-col gap-1">
                <label htmlFor="codigotablet-tablet" className="text-xs font-medium text-blue-600 dark:text-slate-400">
                  Código de tablet
                  <span className="text-slate-600 font-normal ml-1">(opcional — se genera automáticamente)</span>
                </label>
                <input
                  id="codigotablet-tablet"
                  name="codigotablet"
                  type="text"
                  autoComplete="off"
                  placeholder="Ej. CC1-1234 (dejar vacío para auto-generar)"
                  value={values.codigotablet}
                  onChange={handleChange}
                  className={inputCls}
                />
                {state?.errors?.codigotablet && (
                  <p className="text-red-400 text-xs">{state.errors.codigotablet[0]}</p>
                )}
              </div>

              {/* Modelo */}
              <div className="flex flex-col gap-1">
                <label htmlFor="modelo-tablet" className="text-xs font-medium text-blue-600 dark:text-slate-400">
                  Modelo
                </label>
                <input
                  id="modelo-tablet"
                  name="modelo"
                  type="text"
                  autoComplete="off"
                  autoFocus
                  placeholder="Ej. Samsung Tab A8"
                  value={values.modelo}
                  onChange={handleChange}
                  className={inputCls}
                />
                {state?.errors?.modelo && (
                  <p className="text-red-400 text-xs">{state.errors.modelo[0]}</p>
                )}
              </div>

              {/* Serie */}
              <div className="flex flex-col gap-1">
                <label htmlFor="serie-tablet" className="text-xs font-medium text-blue-600 dark:text-slate-400">
                  Número de serie
                </label>
                <input
                  id="serie-tablet"
                  name="serie"
                  type="text"
                  autoComplete="off"
                  placeholder="Ej. SN-001"
                  value={values.serie}
                  onChange={handleChange}
                  className={inputCls}
                />
                {state?.errors?.serie && (
                  <p className="text-red-400 text-xs">{state.errors.serie[0]}</p>
                )}
              </div>

              {/* Alias — col span 2 */}
              <div className="col-span-2 flex flex-col gap-1">
                <label htmlFor="alias-tablet" className="text-xs font-medium text-blue-600 dark:text-slate-400">
                  Alias
                  <span className="text-slate-600 font-normal ml-1">(opcional)</span>
                </label>
                <input
                  id="alias-tablet"
                  name="alias"
                  type="text"
                  autoComplete="off"
                  placeholder="Ej. Tablet-01"
                  value={values.alias}
                  onChange={handleChange}
                  className={inputCls}
                />
                {state?.errors?.alias && (
                  <p className="text-red-400 text-xs">{state.errors.alias[0]}</p>
                )}
              </div>

              {/* Planta — col span 2 */}
              <div className="col-span-2 flex flex-col gap-1">
                <label htmlFor="plantaId-tablet" className="text-xs font-medium text-blue-600 dark:text-slate-400">
                  Planta
                  <span className="text-slate-600 font-normal ml-1">(opcional)</span>
                </label>
                <select
                  id="plantaId-tablet"
                  name="plantaId"
                  value={values.plantaId}
                  onChange={handleChange}
                  className={inputCls}
                >
                  <option value="">Sin planta asignada</option>
                  {plantas.map((p) => (
                    <option key={String(p.id)} value={String(p.id)}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
                {state?.errors?.plantaId && (
                  <p className="text-red-400 text-xs">{state.errors.plantaId[0]}</p>
                )}
              </div>

              {/* Notas — col span 2 */}
              <div className="col-span-2 flex flex-col gap-1">
                <label htmlFor="notes-tablet" className="text-xs font-medium text-blue-600 dark:text-slate-400">
                  Notas
                  <span className="text-slate-600 font-normal ml-1">(opcional)</span>
                </label>
                <textarea
                  id="notes-tablet"
                  name="notes"
                  rows={3}
                  placeholder="Observaciones sobre la tablet..."
                  value={values.notes}
                  onChange={handleChange}
                  className={`${inputCls} resize-none`}
                />
                {state?.errors?.notes && (
                  <p className="text-red-400 text-xs">{state.errors.notes[0]}</p>
                )}
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-blue-200 dark:border-[#1a2d4d]">
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
