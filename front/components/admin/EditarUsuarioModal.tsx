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
    nombreEmpleado: string
    apellidoPaterno: string
    apellidoMaterno: string
    codigo: string
    planta?: string
    plantaId: number | null
    plantas?: { id: number; nombre: string }[]
    rol: string
    correo: string
  }
  plantas: PlantaRow[]
  onClose: () => void
  onSuccess: (updated: UsuarioRow) => void
}

interface FormValues {
  nombreEmpleado: string
  apellidoPaterno: string
  apellidoMaterno: string
  codigoEmpleado: string
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
      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white dark:text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
    >
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {pending ? 'Guardando...' : 'Guardar cambios'}
    </button>
  )
}

// ─── Shared input classes ──────────────────────────────────────────────────────

const inputCls =
  'rounded-lg bg-white dark:bg-[#0c1829] border border-blue-200 dark:border-[#1a2d4d] text-slate-800 dark:text-slate-200 placeholder-slate-500 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors w-full'

// Solo estos roles pueden tener planta(s) asignada(s). Para el resto no se
// muestra el selector de plantas. El correo no aplica a inspector.
const PLANT_ROLES = new Set(['supervisor', 'lider', 'inspector', 'supervisor_regional'])

// ─── Main component ────────────────────────────────────────────────────────────

export function EditarUsuarioModal({ usuario, plantas, onClose, onSuccess }: EditarUsuarioModalProps) {
  const [state, dispatch] = useActionState(updateUser, undefined)
  const [values, setValues] = useState<FormValues>({
    nombreEmpleado: usuario.nombreEmpleado,
    apellidoPaterno: usuario.apellidoPaterno,
    apellidoMaterno: usuario.apellidoMaterno,
    codigoEmpleado: usuario.codigo,
    rol: usuario.rol,
    correo: usuario.correo,
  })
  // Prefill desde el arreglo completo de plantas del usuario (no de plantaId único).
  const [plantaIds, setPlantaIds] = useState<string[]>(
    () => usuario.plantas?.map((p) => String(p.id)) ?? [],
  )

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target
    setValues((prev) => {
      const next = { ...prev, [name]: value }
      // Al cambiar a inspector, el correo no aplica: se limpia.
      if (name === 'rol' && value === 'inspector') next.correo = ''
      return next
    })
    // Al cambiar a un rol sin planta, se limpian las plantas seleccionadas.
    if (name === 'rol' && !PLANT_ROLES.has(value)) {
      setPlantaIds([])
    }
  }

  function togglePlanta(id: string) {
    setPlantaIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )
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
      <div className="bg-white dark:bg-[#0c1829] border border-slate-100 dark:border-[#1a2d4d] rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-scale-in max-h-[90vh] overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-200 dark:border-[#1a2d4d] flex-shrink-0">
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
        <form action={dispatch} className="flex flex-col flex-1 min-h-0">
          <input type="hidden" name="id" value={usuario.id} />

          <div className="p-6 flex flex-col gap-4 overflow-y-auto overflow-x-hidden flex-1">

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
                <label htmlFor="nombreEmpleado" className="text-xs font-medium text-black dark:text-slate-400">
                  Nombre(s)
                </label>
                <input
                  id="nombreEmpleado"
                  name="nombreEmpleado"
                  type="text"
                  autoComplete="off"
                  autoFocus
                  placeholder="Ej. Juan"
                  value={values.nombreEmpleado}
                  onChange={handleChange}
                  className={inputCls}
                />
                {state?.errors?.nombreEmpleado && (
                  <p className="text-red-400 text-xs">{state.errors.nombreEmpleado[0]}</p>
                )}
              </div>

              {/* Apellido paterno */}
              <div className="flex flex-col gap-1">
                <label htmlFor="apellidoPaterno" className="text-xs font-medium text-black dark:text-slate-400">
                  Apellido paterno
                </label>
                <input
                  id="apellidoPaterno"
                  name="apellidoPaterno"
                  type="text"
                  autoComplete="off"
                  placeholder="Ej. Pérez"
                  value={values.apellidoPaterno}
                  onChange={handleChange}
                  className={inputCls}
                />
                {state?.errors?.apellidoPaterno && (
                  <p className="text-red-400 text-xs">{state.errors.apellidoPaterno[0]}</p>
                )}
              </div>

              {/* Apellido materno (opcional) */}
              <div className="flex flex-col gap-1">
                <label htmlFor="apellidoMaterno" className="text-xs font-medium text-black dark:text-slate-400">
                  Apellido materno <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  id="apellidoMaterno"
                  name="apellidoMaterno"
                  type="text"
                  autoComplete="off"
                  placeholder="Ej. García"
                  value={values.apellidoMaterno}
                  onChange={handleChange}
                  className={inputCls}
                />
                {state?.errors?.apellidoMaterno && (
                  <p className="text-red-400 text-xs">{state.errors.apellidoMaterno[0]}</p>
                )}
              </div>

              {/* Código de empleado — col span 2 */}
              <div className="col-span-2 flex flex-col gap-1">
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

              {/* Plantas — solo para roles con planta (supervisor/lider/inspector/supervisor_regional) */}
              {PLANT_ROLES.has(values.rol) && (
              <div className="col-span-2 flex flex-col gap-1">
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
                {state?.errors?.plantaIds && (
                  <p className="text-red-400 text-xs">{state.errors.plantaIds[0]}</p>
                )}
              </div>
              )}

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
                  <option value="superusuario">Superusuario</option>
                  <option value="admin">Administrador</option>
                  <option value="gerente">Gerencia</option>
                  <option value="supervisor_regional">Supervisor Regional</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="lider">Líder</option>
                  <option value="servicio_cliente">Servicio al Cliente</option>
                  <option value="capturacion">Capturación</option>
                  <option value="inspector">Inspector</option>
                </select>
                {state?.errors?.rol && (
                  <p className="text-red-400 text-xs">{state.errors.rol[0]}</p>
                )}
              </div>

              {/* Correo — col span 2 — no aplica a inspector */}
              {values.rol !== 'inspector' && (
              <div className="col-span-2 flex flex-col gap-1">
                <label htmlFor="correo" className="text-xs font-medium text-black dark:text-slate-400">
                  Correo electrónico <span className="text-slate-400 font-normal">(opcional)</span>
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
              )}

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
