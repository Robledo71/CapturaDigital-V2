'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Pencil, KeyRound } from 'lucide-react'
import { NuevoInspectorModal } from './NuevoInspectorModal'
import { EditarInspectorModal } from './EditarInspectorModal'
import { ResetPasswordConfirmModal } from './ResetPasswordConfirmModal'
import { PasswordResultModal } from './PasswordResultModal'
import type { InspectorRow } from '@/shared/types/inspector'
import type { PlantaRow } from '@/shared/types/planta'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Inspector {
  empleadoId: number
  codigoUsuario: string
  nombreEmpleado: string
  apellidoPaterno: string
  apellidoMaterno: string
  nombreCompleto: string
  plantas: { id: number; nombre: string }[]
  activo: boolean
  ocupado: boolean
  trabajoActual: { partNumber: string | null; quotationConsecutive: string | null } | null
}

interface InspectoresPageProps {
  initialInspectors: InspectorRow[]
  count: number
  limit: number
  rol: string
  plantas: PlantaRow[]
}

interface PasswordReveal {
  nombre: string
  password: string
}

// ─── Mapper (outside component for stable reference) ──────────────────────────

function mapRow(i: InspectorRow): Inspector {
  return { ...i }
}

// Muestra las plantas de un inspector: nombre único, lista corta separada por
// comas, o "primera + N" cuando hay demasiadas para no romper el layout de la fila.
function formatPlantas(plantas: { id: number; nombre: string }[]): string {
  if (plantas.length === 0) return '—'
  if (plantas.length <= 2) return plantas.map((p) => p.nombre).join(', ')
  return `${plantas[0].nombre} +${plantas.length - 1}`
}

// ─── Sub-components ────────────────────────────────────────────────────────────

// Disponibilidad: "Trabajando" (ámbar, con la parte/cotización en curso si se
// conoce) cuando el inspector tiene una sesión activa, o "Desocupado" (gris).
function DisponibilidadBadge({ inspector }: { inspector: Inspector }) {
  if (!inspector.ocupado) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-500/10 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" aria-hidden="true" />
        Desocupado
      </span>
    )
  }
  const detalle = inspector.trabajoActual?.partNumber ?? inspector.trabajoActual?.quotationConsecutive ?? null
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400"
      title={detalle ? `Trabajando en ${detalle}` : 'Trabajando'}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse-dot" aria-hidden="true" />
      {detalle ? `Trabajando · ${detalle}` : 'Trabajando'}
    </span>
  )
}

function EstadoBadge({ activo }: { activo: boolean }) {
  if (activo) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300">
        <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400" aria-hidden="true" />
        Activo
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" aria-hidden="true" />
      Inactivo
    </span>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function InspectoresPage({ initialInspectors, count, limit, plantas }: InspectoresPageProps) {
  const router = useRouter()
  const [inspectors, setInspectors] = useState<Inspector[]>(() => initialInspectors.map(mapRow))
  const [search, setSearch] = useState('')
  const [showNuevoModal, setShowNuevoModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Inspector | null>(null)
  const [resetTarget, setResetTarget] = useState<Inspector | null>(null)
  const [passwordReveal, setPasswordReveal] = useState<PasswordReveal | null>(null)
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false })

  // Sync when the server sends a new page of data
  useEffect(() => {
    setInspectors(initialInspectors.map(mapRow))
  }, [initialInspectors])

  // Auto-dismiss toast after 3 s
  useEffect(() => {
    if (!toast.visible) return
    const t = setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3000)
    return () => clearTimeout(t)
  }, [toast.visible])

  function onInspectorCreated(nuevo: InspectorRow, generatedPassword: string) {
    setInspectors((prev) => [mapRow(nuevo), ...prev])
    setShowNuevoModal(false)
    setToast({ message: 'Inspector creado correctamente', visible: true })
    setPasswordReveal({ nombre: nuevo.nombreCompleto, password: generatedPassword })
    router.refresh()
  }

  function onInspectorUpdated(updated: InspectorRow) {
    setInspectors((prev) => prev.map((i) => (i.empleadoId === updated.empleadoId ? mapRow(updated) : i)))
    setEditTarget(null)
    setToast({ message: 'Nombre actualizado correctamente', visible: true })
    router.refresh()
  }

  function onPasswordReset(generatedPassword: string) {
    const nombre = resetTarget?.nombreCompleto ?? ''
    setResetTarget(null)
    setToast({ message: 'Contraseña reseteada correctamente', visible: true })
    setPasswordReveal({ nombre, password: generatedPassword })
    router.refresh()
  }

  const filtered = inspectors.filter((i) => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      i.nombreCompleto.toLowerCase().includes(q) ||
      i.codigoUsuario.toLowerCase().includes(q) ||
      i.plantas.some((p) => p.nombre.toLowerCase().includes(q))
    )
  })

  const atLimit = count >= limit

  return (
    <>
      {/* Modal de creación de inspector */}
      {showNuevoModal && (
        <NuevoInspectorModal
          plantas={plantas}
          onClose={() => setShowNuevoModal(false)}
          onSuccess={onInspectorCreated}
        />
      )}

      {/* Modal de edición de nombre */}
      {editTarget && (
        <EditarInspectorModal
          inspector={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={onInspectorUpdated}
        />
      )}

      {/* Confirmación de reseteo de contraseña */}
      {resetTarget && (
        <ResetPasswordConfirmModal
          inspector={resetTarget}
          onClose={() => setResetTarget(null)}
          onSuccess={onPasswordReset}
        />
      )}

      {/* Revelado único de contraseña generada (creación o reseteo) */}
      {passwordReveal && (
        <PasswordResultModal
          password={passwordReveal.password}
          nombre={passwordReveal.nombre}
          onClose={() => setPasswordReveal(null)}
        />
      )}

      {/* Toast de confirmación */}
      {toast.visible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white dark:bg-[#0c1829] border border-green-500/50 rounded-xl px-5 py-3.5 shadow-2xl transition-all animate-slide-in-right"
        >
          <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0 animate-pulse-dot" aria-hidden="true" />
          <p className="text-sm text-slate-700 dark:text-slate-200">{toast.message}</p>
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">

          {/* Page header */}
          <div className="shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Inspectores</h1>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    atLimit
                      ? 'bg-red-500/10 text-red-500 dark:text-red-400'
                      : 'bg-slate-100 dark:bg-blue-500/20 text-slate-700 dark:text-blue-300'
                  }`}
                >
                  {count}/{limit}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {inspectors.length} cuentas de inspector visibles para tu perfil
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 sm:flex-none">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Buscar inspectores"
                  className="pl-9 pr-4 py-2 text-sm rounded-lg bg-white dark:bg-[#0c1829] border border-blue-200 dark:border-[#1a2d4d] text-slate-800 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 w-full sm:w-52 transition-colors"
                />
              </div>
              {/* Add button */}
              <button
                type="button"
                onClick={() => setShowNuevoModal(true)}
                disabled={atLimit}
                title={atLimit ? 'Se alcanzó el límite de 50 cuentas de inspector.' : undefined}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  atLimit
                    ? 'bg-slate-200 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-500 text-white'
                }`}
              >
                <Plus size={15} />
                Nuevo inspector
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="shrink-0 rounded-xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-[#0c1829] dark:shadow-none bg-white dark:bg-[#0c1829] overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm" aria-label="Tabla de inspectores">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-[#1a2d4d]">
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                      Nombre
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                      Código de usuario
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                      Plantas
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                      Estado
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                      Disponibilidad
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1a2d4d]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-sm">
                        No se encontraron inspectores con los filtros actuales.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((inspector) => (
                      <tr key={inspector.empleadoId} className="hover:bg-blue-50 dark:hover:bg-[#1a2d4d]/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center flex-shrink-0"
                              aria-hidden="true"
                            >
                              <span className="text-white text-xs font-bold">
                                {inspector.nombreCompleto.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                              </span>
                            </div>
                            <span className="text-slate-900 dark:text-slate-200 font-medium">{inspector.nombreCompleto}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                          {inspector.codigoUsuario}
                        </td>
                        <td
                          className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm whitespace-nowrap"
                          title={inspector.plantas.map((p) => p.nombre).join(', ') || undefined}
                        >
                          {formatPlantas(inspector.plantas)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <EstadoBadge activo={inspector.activo} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <DisponibilidadBadge inspector={inspector} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              aria-label={`Editar nombre de ${inspector.nombreCompleto}`}
                              title="Editar nombre"
                              onClick={() => setEditTarget(inspector)}
                              className="p-1.5 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Resetear contraseña de ${inspector.nombreCompleto}`}
                              title="Resetear contraseña"
                              onClick={() => setResetTarget(inspector)}
                              className="p-1.5 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors"
                            >
                              <KeyRound size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
