'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import { updatePlanta } from '@/app/actions/update-planta'
import type { PlantaRow } from '@/shared/types/planta'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditarPlantaModalProps {
  planta: PlantaRow
  onClose: () => void
  onSuccess: (updated: PlantaRow) => void
}

interface FormValues {
  nombre: string
  direccion: string
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
      {pending ? 'Guardando...' : 'Guardar cambios'}
    </button>
  )
}

// ─── Shared input classes ──────────────────────────────────────────────────────

const inputCls =
  'rounded-lg bg-white dark:bg-[#0c1829] border border-blue-200 dark:border-[#1a2d4d] text-slate-200 placeholder-slate-500 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors w-full'

// ─── Main component ────────────────────────────────────────────────────────────

export function EditarPlantaModal({ planta, onClose, onSuccess }: EditarPlantaModalProps) {
  const [state, dispatch] = useActionState(updatePlanta, undefined)
  const [values, setValues] = useState<FormValues>({
    nombre: planta.nombre,
    direccion: planta.direccion ?? '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValues((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  useEffect(() => {
    if (state?.success === true && state.planta) {
      onSuccess(state.planta)
      onClose()
    }
  }, [state])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-editar-planta-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="bg-white dark:bg-[#0c1829] border border-slate-100 dark:border-[#1a2d4d] rounded-xl shadow-2xl w-full max-w-md mx-4">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-200 dark:border-[#1a2d4d]">
          <h2 id="modal-editar-planta-titulo" className="text-blue-950 dark:text-white font-semibold text-base">
            Editar planta
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
          <input type="hidden" name="id" value={String(planta.id)} />

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

            {/* Nombre */}
            <div className="flex flex-col gap-1">
              <label htmlFor="nombre-edit-planta" className="text-xs font-medium text-blue-600 dark:text-slate-400">
                Nombre de la planta
              </label>
              <input
                id="nombre-edit-planta"
                name="nombre"
                type="text"
                autoComplete="off"
                autoFocus
                placeholder="Ej. Silao 1"
                value={values.nombre}
                onChange={handleChange}
                className={inputCls}
              />
              {state?.errors?.nombre && (
                <p className="text-red-400 text-xs">{state.errors.nombre[0]}</p>
              )}
            </div>

            {/* Dirección */}
            <div className="flex flex-col gap-1">
              <label htmlFor="direccion-edit-planta" className="text-xs font-medium text-blue-600 dark:text-slate-400">
                Dirección
                <span className="text-slate-600 font-normal ml-1">(opcional)</span>
              </label>
              <input
                id="direccion-edit-planta"
                name="direccion"
                type="text"
                autoComplete="off"
                placeholder="Ej. Calle Manufactura 1, Silao"
                value={values.direccion}
                onChange={handleChange}
                className={inputCls}
              />
              {state?.errors?.direccion && (
                <p className="text-red-400 text-xs">{state.errors.direccion[0]}</p>
              )}
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
