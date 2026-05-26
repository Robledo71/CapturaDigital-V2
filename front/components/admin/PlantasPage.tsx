'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { NuevoPlantaModal } from './NuevoPlantaModal'
import { EditarPlantaModal } from './EditarPlantaModal'
import type { PlantaRow } from '@/shared/types/planta'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Planta {
  id: number
  nombre: string
  direccion: string | null
  tabletsCount: number
  ordenesActivas: number
}

interface PlantasPageProps {
  initialPlantas: PlantaRow[]
  total: number
  page: number
  pageSize: number
}

// ─── Mapper (outside component for stable reference) ──────────────────────────

function mapRow(p: PlantaRow): Planta {
  return {
    id: p.id,
    nombre: p.nombre,
    direccion: p.direccion,
    tabletsCount: p.tabletsCount,
    ordenesActivas: p.ordenesActivas,
  }
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ConfirmDeleteModal({
  planta,
  onConfirm,
  onCancel,
}: {
  planta: Planta
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-confirmar-delete-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="bg-white dark:bg-[#0c1829] border border-slate-100 dark:border-[#1a2d4d] rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-red-400" aria-hidden="true" />
          </div>
          <div>
            <h3 id="modal-confirmar-delete-titulo" className="text-slate-900 dark:text-white font-semibold text-sm">
              Eliminar planta
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{planta.nombre}</p>
          </div>
        </div>
        <p className="text-slate-700 dark:text-slate-300 text-sm mb-6">
          ¿Eliminar <span className="text-slate-900 dark:text-white font-medium">{planta.nombre}</span>? Esta acción es permanente y no puede revertirse.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-blue-200 dark:border-[#1a2d4d] text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg font-medium bg-red-500/80 hover:bg-red-500 text-white transition-colors"
          >
            Sí, eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function PlantasPage({ initialPlantas, total, page, pageSize }: PlantasPageProps) {
  const router = useRouter()
  const [plantas, setPlantas] = useState<Planta[]>(() => initialPlantas.map(mapRow))
  const [search, setSearch] = useState('')
  const [showNuevoModal, setShowNuevoModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Planta | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Planta | null>(null)
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  })

  // Sync when the server sends a new page of data
  useEffect(() => {
    setPlantas(initialPlantas.map(mapRow))
  }, [initialPlantas])

  // Auto-dismiss toast after 3 s
  useEffect(() => {
    if (!toast.visible) return
    const t = setTimeout(
      () => setToast((prev) => ({ ...prev, visible: false })),
      3000,
    )
    return () => clearTimeout(t)
  }, [toast.visible])

  function onPlantaCreada(p: PlantaRow) {
    setPlantas((prev) => [mapRow(p), ...prev])
    setShowNuevoModal(false)
    setToast({ message: 'Planta creada correctamente', visible: true })
    router.refresh()
  }

  function onPlantaActualizada(p: PlantaRow) {
    setPlantas((prev) =>
      prev.map((item) => (item.id === p.id ? mapRow(p) : item)),
    )
    setEditTarget(null)
    setToast({ message: 'Planta actualizada correctamente', visible: true })
    router.refresh()
  }

  function handleDelete() {
    if (!confirmDelete) return
    setPlantas((prev) => prev.filter((p) => p.id !== confirmDelete.id))
    setConfirmDelete(null)
  }

  const filtered = plantas.filter((p) => {
    const q = search.toLowerCase()
    return (
      !q ||
      p.nombre.toLowerCase().includes(q) ||
      (p.direccion ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <>
      {/* Modal de creación */}
      {showNuevoModal && (
        <NuevoPlantaModal
          onClose={() => setShowNuevoModal(false)}
          onSuccess={onPlantaCreada}
        />
      )}

      {/* Modal de edición */}
      {editTarget && (
        <EditarPlantaModal
          planta={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={onPlantaActualizada}
        />
      )}

      {/* Modal de confirmación de delete */}
      {confirmDelete && (
        <ConfirmDeleteModal
          planta={confirmDelete}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Toast de confirmación */}
      {toast.visible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white dark:bg-[#0c1829] border border-green-500/30 rounded-xl px-5 py-3.5 shadow-2xl transition-all"
        >
          <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-slate-700 dark:text-slate-200">{toast.message}</p>
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

          {/* Page header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Plantas</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {plantas.length} plantas registradas
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
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
                  aria-label="Buscar plantas"
                  className="pl-9 pr-4 py-2 text-sm rounded-lg bg-white dark:bg-[#0c1829] border border-blue-200 dark:border-[#1a2d4d] text-slate-800 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 w-52 transition-colors"
                />
              </div>
              {/* Add button */}
              <button
                type="button"
                onClick={() => setShowNuevoModal(true)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                <Plus size={15} />
                Nueva planta
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-[#1a2d4d] dark:shadow-none bg-white dark:bg-[#0c1829] overflow-hidden" aria-label={`Página ${page} de plantas`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Tabla de plantas">
                <thead>
                  <tr className="border-b border-blue-200 dark:border-[#1a2d4d]">
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Nombre
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Dirección
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Tablets
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Órdenes activas
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2d4d]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-500 text-sm">
                        No se encontraron plantas con los filtros actuales.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((planta) => {
                      const hasTablets = planta.tabletsCount > 0
                      return (
                        <tr key={String(planta.id)} className="hover:bg-blue-50 dark:hover:bg-[#1a2d4d]/40 transition-colors">
                          <td className="px-4 py-3">
                            <span className="text-slate-900 dark:text-slate-200 font-medium">{planta.nombre}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm">
                            {planta.direccion ?? (
                              <span className="text-slate-600 italic">Sin dirección</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-slate-700 dark:text-slate-300 text-sm tabular-nums">
                              {planta.tabletsCount}{' '}
                              <span className="text-slate-500">
                                {planta.tabletsCount === 1 ? 'tablet' : 'tablets'}
                              </span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-slate-700 dark:text-slate-300 text-sm tabular-nums">
                              {planta.ordenesActivas}{' '}
                              <span className="text-slate-500">
                                {planta.ordenesActivas === 1 ? 'orden activa' : 'órdenes activas'}
                              </span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                aria-label={`Editar ${planta.nombre}`}
                                onClick={() => setEditTarget(planta)}
                                className="p-1.5 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                aria-label={`Eliminar ${planta.nombre}`}
                                disabled={hasTablets}
                                title={
                                  hasTablets
                                    ? 'No se puede eliminar: tiene tablets asignadas'
                                    : undefined
                                }
                                onClick={() => !hasTablets && setConfirmDelete(planta)}
                                className={`p-1.5 rounded transition-colors ${
                                  hasTablets
                                    ? 'text-slate-700 cursor-not-allowed'
                                    : 'text-slate-500 hover:text-red-400 hover:bg-blue-50 dark:hover:bg-[#1a2d4d]'
                                }`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {total > pageSize && (
            <div className="flex items-center justify-between gap-4 pt-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mostrando{' '}
                <span className="font-medium text-slate-900 dark:text-white">
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
                </span>{' '}
                de{' '}
                <span className="font-medium text-slate-900 dark:text-white">{total}</span>{' '}
                registros
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => router.push(`?page=${page - 1}`)}
                  aria-label="Página anterior"
                  className="px-3 py-1.5 text-sm rounded-lg border border-blue-200 dark:border-[#1a2d4d] text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {page} / {Math.ceil(total / pageSize)}
                </span>
                <button
                  type="button"
                  disabled={page >= Math.ceil(total / pageSize)}
                  onClick={() => router.push(`?page=${page + 1}`)}
                  aria-label="Página siguiente"
                  className="px-3 py-1.5 text-sm rounded-lg border border-blue-200 dark:border-[#1a2d4d] text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
