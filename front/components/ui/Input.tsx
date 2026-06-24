'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface InputProps {
  id: string
  name: string
  type?: string
  label: string
  placeholder?: string
  error?: string
  autoComplete?: string
  defaultValue?: string
}

export function Input({ id, name, type = 'text', label, placeholder, error, autoComplete, defaultValue }: InputProps) {
  const isPassword = type === 'password'
  const [visible, setVisible] = useState(false)
  // Para contraseñas, alternamos el type según la visibilidad; el resto de campos
  // conserva su type original.
  const inputType = isPassword ? (visible ? 'text' : 'password') : type

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-blue-700 dark:text-slate-300">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={inputType}
          placeholder={placeholder}
          autoComplete={autoComplete}
          defaultValue={defaultValue}
          className={`w-full rounded-lg border px-4 py-3 ${isPassword ? 'pr-11' : ''} text-sm text-blue-950 dark:text-white placeholder:text-slate-500 outline-none transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${error
              ? 'border-red-500 bg-[#0b1120]'
              : 'border-[#1e3050] bg-[#0b1120] hover:border-[#2a4070]'
            }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={visible}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
          >
            {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
