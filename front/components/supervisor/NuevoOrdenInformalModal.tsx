'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { X, Loader2, Plus } from 'lucide-react'
import { crearOrdenInformalAction, type CreateInformalOrderState } from '@/app/actions/create-informal-order'
import type { PlantaRow } from '@/shared/types/planta'
import type { InspectorOption } from '@/back/services/cargaDeTrabajoService'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NuevoOrdenInformalModalProps {
  clientes: { id: number; nombre: string }[]
  plantas: PlantaRow[]
  inspectors: InspectorOption[]
  onClose: () => void
  onSuccess: () => void
}

// ─── Submit button ─────────────────────────────────────────────────────────────

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
    >
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {pending ? 'Creando...' : 'Crear orden informal'}
    </button>
  )
}

// ─── Shared input classes ──────────────────────────────────────────────────────

const inputCls =
  'rounded-lg bg-white dark:bg-[#0c1829] border border-blue-200 dark:border-[#1a2d4d] text-slate-800 dark:text-slate-200 placeholder-slate-500 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors w-full'

// ─── Main component ────────────────────────────────────────────────────────────

export function NuevoOrdenInformalModal({ clientes, plantas, inspectors, onClose, onSuccess }: NuevoOrdenInformalModalProps) {
  const [state, dispatch] = useActionState<CreateInformalOrderState, FormData>(crearOrdenInformalAction, undefined)
  const [tipoOrden, setTipoOrden] = useState<'OV' | 'OA'>('OV')
  const [clienteId, setClienteId] = useState('')
  const [numeroParte, setNumeroParte] = useState('')
  const [nombreParte, setNombreParte] = useState('')
  const [plantaId, setPlantaId] = useState('')
  const [inspectorIds, setInspectorIds] = useState<string[]>([])
  const [incidencias, setIncidencias] = useState<string[]>([''])

  const relevantInspectors = useMemo(() => {
    if (!plantaId) return []
    const id = Number(plantaId)
    return inspectors.filter((i) => i.plantIds.includes(id))
  }, [inspectors, plantaId])

  function togglePlantaChange(id: string) {
    setPlantaId(id)
    setInspectorIds([])
  }

  function toggleInspector(id: string) {
    setInspectorIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  function updateIncidencia(index: number, value: string) {
    setIncidencias((prev) => prev.map((v, i) => (i === index ? value : v)))
  }

  function addIncidencia() {
    setIncidencias((prev) => [...prev, ''])
  }

  function removeIncidencia(index: number) {
    setIncidencias((prev) => {
      const next = prev.filter((_, i) => i !== index)
      return next.length > 0 ? next : ['']
    })
  }

  useEffect(() => {
    if (state?.ok === true) {
      onSuccess()
    }
  }, [state])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nueva-orden-informal-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-[#0c1829] border border-slate-100 dark:border-[#1a2d4d] rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-scale-in max-h-[90vh] overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-200 dark:border-[#1a2d4d] flex-shrink-0">
          <h2 id="nueva-orden-informal-titulo" className="text-blue-950 dark:text-white font-semibold text-base">
            Nueva orden informal
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
            {state?.ok === false && (
              <div role="alert" className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                <p className="text-red-400 text-sm">{state.error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">

              {/* Tipo de orden */}
              <div className="flex flex-col gap-1">
                <label htmlFor="tipo_orden" className="text-xs font-medium text-black dark:text-slate-400">
                  Tipo de orden
                </label>
                <select
                  id="tipo_orden"
                  name="tipo_orden"
                  required
                  value={tipoOrden}
                  onChange={(e) => setTipoOrden(e.target.value as 'OV' | 'OA')}
                  className={inputCls}
                >
                  <option value="OV">OV</option>
                  <option value="OA">OA</option>
                </select>
              </div>

              {/* Cliente */}
              <div className="flex flex-col gap-1">
                <label htmlFor="cliente_id" className="text-xs font-medium text-black dark:text-slate-400">
                  Cliente
                </label>
                <select
                  id="cliente_id"
                  name="cliente_id"
                  required
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className={inputCls}
                >
                  <option value="" disabled>Selecciona un cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Número de parte */}
              <div className="flex flex-col gap-1">
                <label htmlFor="numero_parte" className="text-xs font-medium text-black dark:text-slate-400">
                  Número de parte
                </label>
                <input
                  id="numero_parte"
                  name="numero_parte"
                  type="text"
                  autoComplete="off"
                  required
                  placeholder="Ej. 83600-3BH"
                  value={numeroParte}
                  onChange={(e) => setNumeroParte(e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* Nombre de parte (opcional) */}
              <div className="flex flex-col gap-1">
                <label htmlFor="nombre_parte" className="text-xs font-medium text-black dark:text-slate-400">
                  Nombre de parte <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  id="nombre_parte"
                  name="nombre_parte"
                  type="text"
                  autoComplete="off"
                  placeholder="Ej. MAT SET FLOOR"
                  value={nombreParte}
                  onChange={(e) => setNombreParte(e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* Incidencias — lista dinámica opcional */}
              <div className="col-span-2 flex flex-col gap-1">
                <fieldset className="flex flex-col gap-2">
                  <legend className="text-xs font-medium text-black dark:text-slate-400">
                    Incidencias <span className="text-slate-400 font-normal">(opcional)</span>
                  </legend>
                  <div className="flex flex-col gap-2">
                    {incidencias.map((incidencia, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          name="incidencias"
                          type="text"
                          autoComplete="off"
                          placeholder="Ej. Fuga de aceite"
                          aria-label={`Incidencia ${index + 1}`}
                          value={incidencia}
                          onChange={(e) => updateIncidencia(index, e.target.value)}
                          className={inputCls}
                        />
                        <button
                          type="button"
                          onClick={() => removeIncidencia(index)}
                          aria-label="Eliminar incidencia"
                          className="p-1.5 rounded text-blue-600 dark:text-slate-400 hover:text-red-500 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors flex-shrink-0"
                        >
                          <X size={16} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addIncidencia}
                    className="flex items-center gap-1.5 self-start text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                  >
                    <Plus size={14} aria-hidden="true" />
                    Agregar incidencia
                  </button>
                </fieldset>
              </div>

              {/* Planta */}
              <div className="col-span-2 flex flex-col gap-1">
                <label htmlFor="planta_id" className="text-xs font-medium text-black dark:text-slate-400">
                  Planta
                </label>
                <select
                  id="planta_id"
                  name="planta_id"
                  required
                  value={plantaId}
                  onChange={(e) => togglePlantaChange(e.target.value)}
                  className={inputCls}
                >
                  <option value="" disabled>Selecciona una planta</option>
                  {plantas.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Inspectores — selección múltiple opcional */}
              <div className="col-span-2 flex flex-col gap-1">
                <fieldset className="flex flex-col gap-1">
                  <legend className="text-xs font-medium text-black dark:text-slate-400">
                    Inspectores <span className="text-slate-400 font-normal">(opcional)</span>
                  </legend>
                  <div className="max-h-36 overflow-y-auto rounded-lg border border-blue-200 dark:border-[#1a2d4d] bg-white dark:bg-[#0c1829] p-2 flex flex-col gap-1">
                    {!plantaId ? (
                      <p className="text-xs text-slate-500 px-1 py-1">Selecciona una planta primero</p>
                    ) : relevantInspectors.length === 0 ? (
                      <p className="text-xs text-slate-500 px-1 py-1">No hay inspectores disponibles para esta planta</p>
                    ) : (
                      relevantInspectors.map((i) => {
                        const id = String(i.empleadoId)
                        return (
                          <label
                            key={i.empleadoId}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              name="inspectorIds"
                              value={id}
                              checked={inspectorIds.includes(id)}
                              onChange={() => toggleInspector(id)}
                              className="h-4 w-4 flex-shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500/40"
                            />
                            <span className="flex-1 truncate">{i.name}</span>
                          </label>
                        )
                      })
                    )}
                  </div>
                </fieldset>
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
