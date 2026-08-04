'use client'

import { useActionState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { X, Loader2, KeyRound } from 'lucide-react'
import {
  resetInspectorPasswordAction,
  type ResetInspectorPasswordState,
} from '@/app/actions/reset-inspector-password'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResetPasswordConfirmModalProps {
  inspector: { empleadoId: number; nombreCompleto: string }
  onClose: () => void
  onSuccess: (generatedPassword: string) => void
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
      {pending ? 'Reseteando...' : 'Sí, resetear'}
    </button>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ResetPasswordConfirmModal({ inspector, onClose, onSuccess }: ResetPasswordConfirmModalProps) {
  const [state, dispatch] = useActionState<ResetInspectorPasswordState, FormData>(
    resetInspectorPasswordAction,
    undefined,
  )

  useEffect(() => {
    if (state?.ok === true) {
      onSuccess(state.generatedPassword)
    }
  }, [state])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-modal-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-[#0c1829] border border-slate-100 dark:border-[#1a2d4d] rounded-xl shadow-2xl w-full max-w-sm mx-4 animate-scale-in">
        <form action={dispatch}>
          <input type="hidden" name="empleadoId" value={inspector.empleadoId} />

          <div className="flex items-center justify-between px-6 py-4 border-b border-blue-200 dark:border-[#1a2d4d]">
            <h2 id="reset-modal-titulo" className="text-blue-950 dark:text-white font-semibold text-base">
              Resetear contraseña
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

          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <KeyRound size={18} className="text-amber-400" aria-hidden="true" />
              </div>
              <p className="text-slate-900 dark:text-white font-semibold text-sm">{inspector.nombreCompleto}</p>
            </div>

            <p className="text-slate-700 dark:text-slate-300 text-sm">
              ¿Resetear la contraseña de {inspector.nombreCompleto}? Se generará una nueva y la actual dejará de
              funcionar.
            </p>

            {state?.ok === false && (
              <div role="alert" className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                <p className="text-red-400 text-sm">{state.error}</p>
              </div>
            )}
          </div>

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
