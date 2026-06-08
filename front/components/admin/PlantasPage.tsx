'use client'

import { useState, useEffect, useMemo, useRef, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Pencil, Trash2, AlertTriangle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { NuevoPlantaModal } from './NuevoPlantaModal'
import { EditarPlantaModal } from './EditarPlantaModal'
import { deletePlantaAction } from '@/app/actions/delete-planta'
import type { PlantaRow } from '@/shared/types/planta'

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12

// ─── Types ────────────────────────────────────────────────────────────────────

interface Planta {
  id: number
  nombre: string
  direccion: string | null
}

interface PlantasPageProps {
  initialPlantas: PlantaRow[]
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapRow(p: PlantaRow): Planta {
  return {
    id: p.id,
    nombre: p.nombre,
    direccion: p.direccion,
  }
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ConfirmDeleteModal({
  planta,
  onConfirm,
  onCancel,
  pending = false,
}: {
  planta: Planta
  onConfirm: () => void
  onCancel: () => void
  pending?: boolean
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-confirmar-delete-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-[#0c1829] border border-slate-100 dark:border-[#1a2d4d] rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 animate-scale-in">
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
            disabled={pending}
            className="px-4 py-2 text-sm rounded-lg border border-blue-200 dark:border-[#1a2d4d] text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium bg-red-500/80 hover:bg-red-500 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            {pending ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function PlantasPage({ initialPlantas }: PlantasPageProps) {
  const router = useRouter()
  const [plantas, setPlantas] = useState<Planta[]>(() => initialPlantas.map(mapRow))
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showNuevoModal, setShowNuevoModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Planta | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Planta | null>(null)
  const [deleteState, deleteDispatch, isDeleting] = useActionState(deletePlantaAction, undefined)
  const pendingDeleteIdRef = useRef<number | null>(null)
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  })

  // Sync when the server sends fresh data after revalidatePath
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

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1)
  }, [search])

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
    if (!confirmDelete || isDeleting) return
    pendingDeleteIdRef.current = confirmDelete.id
    const fd = new FormData()
    fd.set('id', String(confirmDelete.id))
    deleteDispatch(fd)
  }

  // Procesa el resultado de la acción de borrado (éxito o error de negocio).
  useEffect(() => {
    if (!deleteState) return
    if (deleteState.ok) {
      const id = pendingDeleteIdRef.current
      if (id != null) setPlantas((prev) => prev.filter((p) => p.id !== id))
      setToast({ message: 'Planta eliminada correctamente', visible: true })
    } else if (deleteState.error) {
      setToast({ message: deleteState.error, visible: true })
    }
    pendingDeleteIdRef.current = null
    setConfirmDelete(null)
  }, [deleteState])

  // ── Búsqueda sobre la lista completa ──────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return plantas
    return plantas.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.direccion ?? '').toLowerCase().includes(q),
    )
  }, [plantas, search])

  // ── Paginación en el cliente ───────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

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
          pending={isDeleting}
        />
      )}

      {/* Toast de confirmación */}
      {toast.visible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white dark:bg-[#0c1829] border border-green-500/30 rounded-xl px-5 py-3.5 shadow-2xl animate-slide-in-right"
        >
          <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0 animate-pulse-dot" aria-hidden="true" />
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
                {filtered.length === plantas.length
                  ? `${plantas.length} plantas registradas`
                  : `${filtered.length} de ${plantas.length} plantas`}
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
                  placeholder="Buscar por nombre o dirección..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Buscar plantas"
                  className="pl-9 pr-4 py-2 text-sm rounded-lg bg-white dark:bg-[#0c1829] border border-blue-200 dark:border-[#1a2d4d] text-slate-800 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 w-64 transition-colors"
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
          <div className="rounded-xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-[#1a2d4d] dark:shadow-none bg-white dark:bg-[#0c1829] overflow-hidden">
            <div className="overflow-x-auto overflow-y-hidden">
              <table className="w-full text-sm" aria-label="Tabla de plantas">
                <thead>
                  <tr className="border-b border-blue-200 dark:border-[#1a2d4d]">
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Nombre
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Dirección
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1a2d4d]">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-12 text-center text-slate-500 text-sm">
                        {search.trim()
                          ? `Sin resultados para "${search.trim()}"`
                          : 'No hay plantas registradas.'}
                      </td>
                    </tr>
                  ) : (
                    paginated.map((planta) => (
                      <tr key={String(planta.id)} className="hover:bg-blue-50 dark:hover:bg-[#1a2d4d]/40 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-slate-900 dark:text-slate-200 font-medium">{planta.nombre}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm">
                          {planta.direccion ?? (
                            <span className="text-slate-400 dark:text-slate-600 italic">Sin dirección</span>
                          )}
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
                              onClick={() => setConfirmDelete(planta)}
                              className="p-1.5 rounded text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-[#1a2d4d] transition-colors"
                            >
                              <Trash2 size={14} />
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

          {/* Paginación — solo frontend, sin requests al servidor */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 pt-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mostrando{' '}
                <span className="font-medium text-slate-900 dark:text-white">
                  {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}
                </span>{' '}
                de{' '}
                <span className="font-medium text-slate-900 dark:text-white">{filtered.length}</span>{' '}
                registros
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  aria-label="Página anterior"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 dark:border-[#1a2d4d] text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="px-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  aria-label="Página siguiente"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 dark:border-[#1a2d4d] text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
