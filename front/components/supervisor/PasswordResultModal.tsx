'use client'

import { useState } from 'react'
import { X, Copy, Check, AlertTriangle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PasswordResultModalProps {
  password: string
  nombre?: string
  onClose: () => void
}

// ─── Main component ────────────────────────────────────────────────────────────

// Modal compartido para revelar UNA SOLA VEZ una contraseña generada por el
// sistema (creación de inspector o reseteo). Nunca vuelve a mostrarse: el
// backend no la devuelve en ningún otro endpoint.
export function PasswordResultModal({ password, nombre, onClose }: PasswordResultModalProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API no disponible (contexto no seguro, permisos, etc.) — no bloquea el flujo.
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-modal-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-[#0c1829] border border-slate-100 dark:border-[#1a2d4d] rounded-xl shadow-2xl w-full max-w-md mx-4 animate-scale-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-200 dark:border-[#1a2d4d]">
          <h2 id="password-modal-titulo" className="text-blue-950 dark:text-white font-semibold text-base">
            Contraseña generada
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
          {nombre && (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Cuenta de <span className="font-medium text-slate-900 dark:text-white">{nombre}</span>
            </p>
          )}

          {/* Password box */}
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-slate-50 dark:bg-[#0a1628] border border-blue-200 dark:border-[#1a2d4d] px-3 py-2.5 text-base font-mono tracking-wide text-slate-900 dark:text-white select-all">
              {password}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copiar contraseña"
              className={`flex items-center justify-center h-10 w-10 flex-shrink-0 rounded-lg border transition-colors ${
                copied
                  ? 'border-green-500/40 bg-green-500/10 text-green-500'
                  : 'border-blue-200 dark:border-[#1a2d4d] text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-[#1a2d4d]'
              }`}
            >
              {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            </button>
          </div>
          {copied && (
            <p role="status" className="text-xs text-green-500 -mt-2">
              Copiada al portapapeles
            </p>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-amber-600 dark:text-amber-400 text-xs">
              Contraseña generada — cópiala ahora, no se volverá a mostrar.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-blue-200 dark:border-[#1a2d4d]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}
