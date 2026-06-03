'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import { updateUser } from '@/app/actions/update-user'
import type { UsuarioRow } from '@/shared/types/usuario'
import type { PlantaRow } from '@/shared/types/planta'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditarUsuarioModalProps {
  usuario: {
    id: number | string
    nombre: string
    codigo: string
    puesto: string
    planta?: string
    plantaId: number | null
    rol: string
    correo: string
  }
  plantas: PlantaRow[]
  onClose: () => void
  onSuccess: (updated: UsuarioRow) => void
}

interface FormValues {
  nombreCompleto: string
  codigoEmpleado: string
  puesto: string
  plantaId: string
  rol: string
  correo: string
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
  'rounded-lg bg-white dark:bg-[#0c1829] border border-blue-200 dark:border-[#1a2d4d] text-slate-800 dark:text-slate-200 placeholder-slate-500 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors w-full'

// ─── Main component ────────────────────────────────────────────────────────────

export function EditarUsuarioModal({ usuario, plantas, onClose, onSuccess }: EditarUsuarioModalProps) {
  const [state, dispatch] = useActionState(updateUser, undefined)
  const [values, setValues] = useState<FormValues>({
    nombreCompleto: usuario.nombre,
    codigoEmpleado: usuario.codigo,
    puesto: usuario.puesto,
    plantaId: usuario.plantaId !== null ? String(usuario.plantaId) : '',
    rol: usuario.rol,
    correo: usuario.correo,
  })

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
      aria-labelledby="modal-editar-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-[#0c1829] border border-slate-100 dark:border-[#1a2d4d] rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-scale-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-200 dark:border-[#1a2d4d]">
          <h2 id="modal-editar-titulo" className="text-blue-950 dark:text-white font-semibold text-base">
            Editar usuario
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
          <input type="hidden" name="id" value={usuario.id} />

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

            {/* Grid de campos */}
            <div className="grid grid-cols-2 gap-4">

              {/* Nombre completo — col span 2 */}
              <div className="col-span-2 flex flex-col gap-1">
                <label htmlFor="nombreCompleto" className="text-xs font-medium text-blue-600 dark:text-slate-400">
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
                <label htmlFor="codigoEmpleado" className="text-xs font-medium text-blue-600 dark:text-slate-400">
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
                <label htmlFor="puesto" className="text-xs font-medium text-blue-600 dark:text-slate-400">
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
                <label htmlFor="plantaId" className="text-xs font-medium text-blue-600 dark:text-slate-400">
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
                <label htmlFor="rol" className="text-xs font-medium text-blue-600 dark:text-slate-400">
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
                  <option value="cliente">Cliente</option>
                </select>
                {state?.errors?.rol && (
                  <p className="text-red-400 text-xs">{state.errors.rol[0]}</p>
                )}
              </div>

              {/* Correo — col span 2 */}
              <div className="col-span-2 flex flex-col gap-1">
                <label htmlFor="correo" className="text-xs font-medium text-blue-600 dark:text-slate-400">
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
