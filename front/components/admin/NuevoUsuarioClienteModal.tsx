'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { X, Loader2, Eye, EyeOff } from 'lucide-react'
import { createClientUser } from '@/app/actions/create-client-user'
import type { ClienteRow } from '@/shared/types/cliente'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NuevoUsuarioClienteModalProps {
  cliente: ClienteRow
  onClose: () => void
  onSuccess: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generarCodigoEmpleado(nombre: string, id: number): string {
  const normalized = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
  const prefijo = (normalized.slice(0, 3) || 'CLI').padEnd(3, 'X')
  return `${prefijo}-${id}`
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
      {pending ? 'Creando...' : 'Crear usuario'}
    </button>
  )
}

// ─── Shared input classes ──────────────────────────────────────────────────────

const inputCls =
  'rounded-lg bg-white dark:bg-[#0c1829] border border-blue-200 dark:border-[#1a2d4d] text-slate-800 dark:text-slate-200 placeholder-slate-500 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors w-full'

const inputDisabledCls =
  'rounded-lg bg-slate-100 dark:bg-[#0a1322] border border-blue-200 dark:border-[#1a2d4d] text-slate-500 dark:text-slate-400 px-3 py-2 text-sm cursor-not-allowed w-full'

// ─── Main component ────────────────────────────────────────────────────────────

export function NuevoUsuarioClienteModal({ cliente, onClose, onSuccess }: NuevoUsuarioClienteModalProps) {
  const [state, dispatch] = useActionState(createClientUser, undefined)

  const [nombreCompleto, setNombreCompleto] = useState(cliente.nombre)
  const [codigoEmpleado, setCodigoEmpleado] = useState(
    () => generarCodigoEmpleado(cliente.nombre, cliente.id),
  )
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)

  useEffect(() => {
    if (state?.success === true) {
      onSuccess()
      onClose()
    }
  }, [state])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-nuevo-usuario-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-[#0c1829] border border-slate-100 dark:border-[#1a2d4d] rounded-xl shadow-2xl w-full max-w-md mx-4 animate-scale-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-200 dark:border-[#1a2d4d]">
          <h2 id="modal-nuevo-usuario-titulo" className="text-blue-950 dark:text-white font-semibold text-base">
            Crear usuario — {cliente.nombre}
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
        <form action={dispatch}>
          <input type="hidden" name="clienteId" value={String(cliente.id)} />

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

            {/* Nombre completo */}
            <div className="flex flex-col gap-1">
              <label htmlFor="cu-nombre" className="text-xs font-medium text-black dark:text-slate-400">
                Nombre completo
              </label>
              <input
                id="cu-nombre"
                name="nombreCompleto"
                type="text"
                autoComplete="off"
                autoFocus
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                className={inputCls}
              />
              {state?.errors?.nombreCompleto && (
                <p className="text-red-400 text-xs">{state.errors.nombreCompleto[0]}</p>
              )}
            </div>

            {/* Código empleado */}
            <div className="flex flex-col gap-1">
              <label htmlFor="cu-codigo" className="text-xs font-medium text-black dark:text-slate-400">
                Código cliente
              </label>
              <input
                id="cu-codigo"
                name="codigoEmpleado"
                type="text"
                autoComplete="off"
                value={codigoEmpleado}
                onChange={(e) => setCodigoEmpleado(e.target.value)}
                className={inputCls}
              />
              {state?.errors?.codigoEmpleado && (
                <p className="text-red-400 text-xs">{state.errors.codigoEmpleado[0]}</p>
              )}
            </div>

            {/* Correo */}
            <div className="flex flex-col gap-1">
              <label htmlFor="cu-correo" className="text-xs font-medium text-black dark:text-slate-400">
                Correo electrónico
              </label>
              <input
                id="cu-correo"
                name="correo"
                type="email"
                autoComplete="off"
                placeholder="empresa@ejemplo.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className={inputCls}
              />
              {state?.errors?.correo && (
                <p className="text-red-400 text-xs">{state.errors.correo[0]}</p>
              )}
            </div>

            {/* Contraseña */}
            <div className="flex flex-col gap-1">
              <label htmlFor="cu-contrasena" className="text-xs font-medium text-black dark:text-slate-400">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="cu-contrasena"
                  name="contrasena"
                  type={mostrarPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword((v) => !v)}
                  aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {mostrarPassword
                    ? <EyeOff size={15} aria-hidden="true" />
                    : <Eye size={15} aria-hidden="true" />
                  }
                </button>
              </div>
              {state?.errors?.contrasena && (
                <p className="text-red-400 text-xs">{state.errors.contrasena[0]}</p>
              )}
            </div>

            {/* Puesto (readonly — el service siempre envía "Cliente") */}
            <div className="flex flex-col gap-1">
              <label htmlFor="cu-puesto" className="text-xs font-medium text-black dark:text-slate-400">
                Puesto
              </label>
              <input
                id="cu-puesto"
                type="text"
                readOnly
                disabled
                value="Cliente"
                className={inputDisabledCls}
              />
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
