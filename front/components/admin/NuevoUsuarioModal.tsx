'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { X, Loader2, Eye, EyeOff } from 'lucide-react'
import { createUser } from '@/app/actions/create-user'
import type { UsuarioRow } from '@/shared/types/usuario'
import type { PlantaRow } from '@/shared/types/planta'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NuevoUsuarioModalProps {
  plantas: PlantaRow[]
  onClose: () => void
  onSuccess: (usuario: UsuarioRow) => void
}

interface FormValues {
  nombreCompleto: string
  codigoEmpleado: string
  puesto: string
  plantaId: string
  rol: string
  correo: string
  contrasena: string
  confirmContrasena: string
}

const EMPTY_VALUES: FormValues = {
  nombreCompleto: '',
  codigoEmpleado: '',
  puesto: '',
  plantaId: '',
  rol: '',
  correo: '',
  contrasena: '',
  confirmContrasena: '',
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

// ─── Main component ────────────────────────────────────────────────────────────

export function NuevoUsuarioModal({ plantas, onClose, onSuccess }: NuevoUsuarioModalProps) {
  const [state, dispatch] = useActionState(createUser, undefined)
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES)
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    setValues((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  useEffect(() => {
    if (state?.success === true && state.usuario) {
      onSuccess(state.usuario)
      onClose()
    }
  }, [state])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-[#0c1829] border border-slate-100 dark:border-[#1a2d4d] rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-scale-in max-h-[90vh] overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-200 dark:border-[#1a2d4d] flex-shrink-0">
          <h2 id="modal-titulo" className="text-blue-950 dark:text-white font-semibold text-base">
            Nuevo usuario
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

              {/* Nombre completo — col span 2 */}
              <div className="col-span-2 flex flex-col gap-1">
                <label htmlFor="nombreCompleto" className="text-xs font-medium text-black dark:text-slate-400">
                  Nombre completo
                </label>
                <input
                  id="nombreCompleto"
                  name="nombreCompleto"
                  type="text"
                  autoComplete="off"
                  autoFocus
                  placeholder="Ej. Juan Pérez García"
                  value={values.nombreCompleto}
                  onChange={handleChange}
                  className={inputCls}
                />
                {state?.errors?.nombreCompleto && (
                  <p className="text-red-400 text-xs">{state.errors.nombreCompleto[0]}</p>
                )}
              </div>

              {/* Código de empleado */}
              <div className="flex flex-col gap-1">
                <label htmlFor="codigoEmpleado" className="text-xs font-medium text-black dark:text-slate-400">
                  Código de empleado
                </label>
                <input
                  id="codigoEmpleado"
                  name="codigoEmpleado"
                  type="text"
                  autoComplete="off"
                  placeholder="Ej. S-005"
                  value={values.codigoEmpleado}
                  onChange={handleChange}
                  className={inputCls}
                />
                {state?.errors?.codigoEmpleado && (
                  <p className="text-red-400 text-xs">{state.errors.codigoEmpleado[0]}</p>
                )}
              </div>

              {/* Puesto */}
              <div className="flex flex-col gap-1">
                <label htmlFor="puesto" className="text-xs font-medium text-black dark:text-slate-400">
                  Puesto
                </label>
                <input
                  id="puesto"
                  name="puesto"
                  type="text"
                  autoComplete="off"
                  placeholder="Ej. Supervisor de calidad"
                  value={values.puesto}
                  onChange={handleChange}
                  className={inputCls}
                />
                {state?.errors?.puesto && (
                  <p className="text-red-400 text-xs">{state.errors.puesto[0]}</p>
                )}
              </div>

              {/* Planta */}
              <div className="flex flex-col gap-1">
                <label htmlFor="plantaId" className="text-xs font-medium text-black dark:text-slate-400">
                  Planta
                </label>
                <select
                  id="plantaId"
                  name="plantaId"
                  value={values.plantaId}
                  onChange={handleChange}
                  className={inputCls}
                >
                  <option value="">Selecciona una planta</option>
                  {plantas.map((p) => (
                    <option key={p.id} value={String(p.id)}>{p.nombre}</option>
                  ))}
                </select>
                {state?.errors?.plantaId && (
                  <p className="text-red-400 text-xs">{state.errors.plantaId[0]}</p>
                )}
              </div>

              {/* Rol */}
              <div className="flex flex-col gap-1">
                <label htmlFor="rol" className="text-xs font-medium text-black dark:text-slate-400">
                  Rol
                </label>
                <select
                  id="rol"
                  name="rol"
                  value={values.rol}
                  onChange={handleChange}
                  className={inputCls}
                >
                  <option value="" disabled className="text-slate-500">
                    Selecciona un rol
                  </option>
                  <option value="admin">Administrador</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="lider">Líder</option>
                  <option value="capturacion">Capturación</option>
                  <option value="servicio_cliente">Servicio al Cliente</option>
                  <option value="cliente">Cliente</option>
                </select>
                {state?.errors?.rol && (
                  <p className="text-red-400 text-xs">{state.errors.rol[0]}</p>
                )}
              </div>

              {/* Correo — col span 2 */}
              <div className="col-span-2 flex flex-col gap-1">
                <label htmlFor="correo" className="text-xs font-medium text-black dark:text-slate-400">
                  Correo electrónico
                </label>
                <input
                  id="correo"
                  name="correo"
                  type="email"
                  autoComplete="off"
                  placeholder="usuario@empresa.com"
                  value={values.correo}
                  onChange={handleChange}
                  className={inputCls}
                />
                {state?.errors?.correo && (
                  <p className="text-red-400 text-xs">{state.errors.correo[0]}</p>
                )}
              </div>

              {/* Contraseña */}
              <div className="flex flex-col gap-1">
                <label htmlFor="contrasena" className="text-xs font-medium text-black dark:text-slate-400">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="contrasena"
                    name="contrasena"
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                    value={values.contrasena}
                    onChange={handleChange}
                    className={`${inputCls} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showPwd}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  >
                    {showPwd ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>
                {state?.errors?.contrasena && (
                  <p className="text-red-400 text-xs">{state.errors.contrasena[0]}</p>
                )}
              </div>

              {/* Confirmar contraseña */}
              <div className="flex flex-col gap-1">
                <label htmlFor="confirmContrasena" className="text-xs font-medium text-black dark:text-slate-400">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    id="confirmContrasena"
                    name="confirmContrasena"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Repite la contraseña"
                    value={values.confirmContrasena}
                    onChange={handleChange}
                    className={`${inputCls} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showConfirm}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  >
                    {showConfirm ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>
                {state?.errors?.confirmContrasena && (
                  <p className="text-red-400 text-xs">{state.errors.confirmContrasena[0]}</p>
                )}
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
