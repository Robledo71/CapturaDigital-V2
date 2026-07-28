'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import { createCliente } from '@/app/actions/create-cliente'
import type { ClienteRow } from '@/shared/types/cliente'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NuevoClienteModalProps {
  onClose: () => void
  onSuccess: (cliente: ClienteRow) => void
}

interface FormValues {
  nombre: string
  rfc: string
  direccion: string
  razonSocial: string
  po: boolean
}

const EMPTY_VALUES: FormValues = {
  nombre: '',
  rfc: '',
  direccion: '',
  razonSocial: '',
  po: false,
}

// ─── Submit button ─────────────────────────────────────────────────────────────

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white dark:text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
    >
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {pending ? 'Creando...' : 'Crear cliente'}
    </button>
  )
}

// ─── Shared input classes ──────────────────────────────────────────────────────

const inputCls =
  'rounded-lg bg-white dark:bg-[#0c1829] border border-blue-200 dark:border-[#1a2d4d] text-slate-800 dark:text-slate-200 placeholder-slate-500 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors w-full'

// ─── Main component ────────────────────────────────────────────────────────────

export function NuevoClienteModal({ onClose, onSuccess }: NuevoClienteModalProps) {
  const [state, dispatch] = useActionState(createCliente, undefined)
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target
    setValues((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  useEffect(() => {
    if (state?.success === true && state.cliente) {
      onSuccess(state.cliente)
      onClose()
    }
  }, [state])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-nuevo-cliente-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-[#0c1829] border border-slate-100 dark:border-[#1a2d4d] rounded-xl shadow-2xl w-full max-w-md mx-4 animate-scale-in max-h-[90vh] overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-200 dark:border-[#1a2d4d] flex-shrink-0">
          <h2 id="modal-nuevo-cliente-titulo" className="text-blue-950 dark:text-white font-semibold text-base">
            Nuevo cliente
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
            {state?.errors?.general && (
              <div
                role="alert"
                className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3"
              >
                <p className="text-red-400 text-sm">{state.errors.general[0]}</p>
              </div>
            )}

            {/* Grid de campos */}
            <div className="grid grid-cols-2 gap-4">

              {/* Nombre — col span 2 */}
              <div className="col-span-2 flex flex-col gap-1">
                <label htmlFor="nombre-cliente" className="text-xs font-medium text-black dark:text-slate-400">
                  Nombre del cliente
                </label>
                <input
                  id="nombre-cliente"
                  name="nombre"
                  type="text"
                  autoComplete="off"
                  autoFocus
                  required
                  placeholder="Ej. Grupo Antolin"
                  value={values.nombre}
                  onChange={handleChange}
                  className={inputCls}
                />
                {state?.errors?.nombre && (
                  <p className="text-red-400 text-xs">{state.errors.nombre[0]}</p>
                )}
              </div>

              {/* RFC */}
              <div className="flex flex-col gap-1">
                <label htmlFor="rfc-cliente" className="text-xs font-medium text-black dark:text-slate-400">
                  RFC
                </label>
                <input
                  id="rfc-cliente"
                  name="rfc"
                  type="text"
                  autoComplete="off"
                  required
                  placeholder="Ej. GAN010101ABC"
                  value={values.rfc}
                  onChange={handleChange}
                  className={inputCls}
                />
                {state?.errors?.rfc && (
                  <p className="text-red-400 text-xs">{state.errors.rfc[0]}</p>
                )}
              </div>

              {/* Razón social (opcional) */}
              <div className="flex flex-col gap-1">
                <label htmlFor="razonSocial-cliente" className="text-xs font-medium text-black dark:text-slate-400">
                  Razón social <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  id="razonSocial-cliente"
                  name="razonSocial"
                  type="text"
                  autoComplete="off"
                  placeholder="Ej. Grupo Antolin S.A. de C.V."
                  value={values.razonSocial}
                  onChange={handleChange}
                  className={inputCls}
                />
                {state?.errors?.razonSocial && (
                  <p className="text-red-400 text-xs">{state.errors.razonSocial[0]}</p>
                )}
              </div>

              {/* Dirección — col span 2 */}
              <div className="col-span-2 flex flex-col gap-1">
                <label htmlFor="direccion-cliente" className="text-xs font-medium text-black dark:text-slate-400">
                  Dirección
                </label>
                <input
                  id="direccion-cliente"
                  name="direccion"
                  type="text"
                  autoComplete="off"
                  required
                  placeholder="Ej. Av. Industria 1, Silao"
                  value={values.direccion}
                  onChange={handleChange}
                  className={inputCls}
                />
                {state?.errors?.direccion && (
                  <p className="text-red-400 text-xs">{state.errors.direccion[0]}</p>
                )}
              </div>

              {/* Requiere PO — col span 2 */}
              <label
                htmlFor="po-cliente"
                className="col-span-2 flex items-center gap-2.5 rounded-lg px-1 py-1.5 cursor-pointer"
              >
                <input
                  id="po-cliente"
                  name="po"
                  type="checkbox"
                  checked={values.po}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Requiere orden de compra (PO)
                </span>
              </label>

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
