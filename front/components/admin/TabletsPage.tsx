'use client'

import { useState, useEffect, useActionState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Pencil, Power, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { NuevoTabletModal } from './NuevoTabletModal'
import { EditarTabletModal } from './EditarTabletModal'
import { toggleTabletStatusAction, type ToggleTabletStatusState } from '@/app/actions/toggle-tablet-status'
import type { TabletRow } from '@/shared/types/tablet'
import type { PlantaRow } from '@/shared/types/planta'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tablet {
  id: number
  codigotablet: string
  alias: string | null
  modelo: string
  serie: string
  plantaId: number | null
  plantaNombre: string | null
  inspector: string | null
  estado: string
  ultimaActividad: string
  notes: string | null
}

interface TabletsPageProps {
  initialTablets: TabletRow[]
  plantas: PlantaRow[]
}

const PAGE_SIZE = 12

type TabKey = 'todas' | 'activa' | 'offline' | 'inactiva'

interface TabConfig {
  key: TabKey
  label: string
  count: number
}

// ─── Mapper (outside component for stable reference) ──────────────────────────

function mapRow(t: TabletRow): Tablet {
  return {
    id: t.id,
    codigotablet: t.codigotablet,
    alias: t.alias,
    modelo: t.modelo,
    serie: t.serie,
    plantaId: t.plantaId,
    plantaNombre: t.plantaNombre,
    inspector: t.inspector,
    estado: t.estado,
    ultimaActividad: t.ultimaActividad,
    notes: t.notes,
  }
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: string }) {
  if (estado === 'activa') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300">
        <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400" aria-hidden="true" />
        Activa
      </span>
    )
  }
  if (estado === 'offline') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-600 dark:bg-yellow-400" aria-hidden="true" />
        Offline
      </span>
    )
  }
  if (estado === 'mantenimiento') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" aria-hidden="true" />
        Mantenimiento
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" aria-hidden="true" />
      Inactiva
    </span>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function TabletsPage({ initialTablets, plantas }: TabletsPageProps) {
  const router = useRouter()
  const [tablets, setTablets] = useState<Tablet[]>(() => initialTablets.map(mapRow))
  const [activeTab, setActiveTab] = useState<TabKey>('todas')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showNuevoModal, setShowNuevoModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Tablet | null>(null)
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  })
  const [toggleState, toggleAction] = useActionState<ToggleTabletStatusState, FormData>(toggleTabletStatusAction, undefined)
  const [isToggling, startToggleTransition] = useTransition()

  // Sync when the server sends a new page of data
  useEffect(() => {
    setTablets(initialTablets.map(mapRow))
  }, [initialTablets])

  // Auto-dismiss toast after 3 s
  useEffect(() => {
    if (!toast.visible) return
    const t = setTimeout(
      () => setToast((prev) => ({ ...prev, visible: false })),
      3000,
    )
    return () => clearTimeout(t)
  }, [toast.visible])

  function onTabletRegistrada(t: TabletRow) {
    setTablets((prev) => [mapRow(t), ...prev])
    setShowNuevoModal(false)
    setToast({ message: 'Tablet registrada correctamente', visible: true })
    router.refresh()
  }

  function onTabletActualizada(t: TabletRow) {
    setTablets((prev) =>
      prev.map((item) => (item.id === t.id ? mapRow(t) : item)),
    )
    setEditTarget(null)
    setToast({ message: 'Tablet actualizada correctamente', visible: true })
    router.refresh()
  }

  function toggleEstado(tablet: Tablet) {
    const newStatus = tablet.estado === 'activa' ? 'inactiva' : 'activa'
    const fd = new FormData()
    fd.set('codigoTablet', tablet.codigotablet)
    fd.set('status', newStatus)

    startToggleTransition(() => {
      toggleAction(fd)
    })

    // Optimistic update
    setTablets((prev) =>
      prev.map((t) => t.id === tablet.id ? { ...t, estado: newStatus } : t),
    )
  }

  // Dynamic tabs calculated from state
  const tabs: TabConfig[] = [
    { key: 'todas',    label: 'Todas',    count: tablets.length },
    { key: 'activa',   label: 'Activas',  count: tablets.filter((t) => t.estado === 'activa').length },
    { key: 'offline',  label: 'Offline',  count: tablets.filter((t) => t.estado === 'offline').length },
    { key: 'inactiva', label: 'Inactivas', count: tablets.filter((t) => t.estado === 'inactiva' || t.estado === 'mantenimiento').length },
  ]

  const filtered = tablets.filter((t) => {
    const matchTab =
      activeTab === 'todas'
        ? true
        : activeTab === 'inactiva'
        ? t.estado === 'inactiva' || t.estado === 'mantenimiento'
        : t.estado === activeTab
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      t.codigotablet.toLowerCase().includes(q) ||
      (t.alias ?? '').toLowerCase().includes(q) ||
      t.modelo.toLowerCase().includes(q) ||
      t.serie.toLowerCase().includes(q) ||
      (t.plantaNombre ?? '').toLowerCase().includes(q) ||
      (t.inspector ?? '').toLowerCase().includes(q)
    return matchTab && matchSearch
  })

  // Paginación en cliente sobre el set filtrado.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // Al cambiar búsqueda o pestaña, vuelve a la página 1.
  useEffect(() => {
    setPage(1)
  }, [search, activeTab])

  return (
    <>
      {/* Modal de registro */}
      {showNuevoModal && (
        <NuevoTabletModal
          plantas={plantas}
          onClose={() => setShowNuevoModal(false)}
          onSuccess={onTabletRegistrada}
        />
      )}

      {/* Modal de edición */}
      {editTarget && (
        <EditarTabletModal
          tablet={editTarget}
          plantas={plantas}
          onClose={() => setEditTarget(null)}
          onSuccess={onTabletActualizada}
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

      {/* Error de toggle */}
      {toggleState && !toggleState.ok && (
        <div
          role="alert"
          className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3.5 shadow-2xl animate-slide-in-right"
        >
          <p className="text-sm text-red-400">{toggleState.error}</p>
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">

          {/* Page header */}
          <div className="shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Tablets</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {tablets.length} tablets registradas
              </p>
            </div>
            <div className="flex items-center gap-3">
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
                  aria-label="Buscar tablets"
                  className="pl-9 pr-4 py-2 text-sm rounded-lg bg-white dark:bg-[#0c1829] border border-blue-200 dark:border-[#1a2d4d] text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 w-full sm:w-52 transition-colors"
                />
              </div>
              {/* Add button */}
              <button
                type="button"
                onClick={() => setShowNuevoModal(true)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap"
              >
                <Plus size={15} />
                Registrar tablet
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div
            role="tablist"
            aria-label="Filtrar por estado"
            className="shrink-0 flex items-end gap-0 border-b border-blue-200 dark:border-[#1a2d4d] overflow-x-auto scrollbar-thin"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap ${
                    isActive
                      ? 'text-slate-900 dark:text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-500'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      isActive
                        ? 'bg-slate-100 dark:bg-blue-500/20 text-slate-700 dark:text-blue-300'
                        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Table */}
          <div className="shrink-0 rounded-xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-[#1a2d4d] dark:shadow-none bg-white dark:bg-[#0c1829] overflow-hidden" aria-label={`Página ${currentPage} de tablets`}>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm" aria-label="Tabla de tablets">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-[#1a2d4d]">
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                      Código
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                      Alias
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                      Modelo
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                      Serie
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                      Planta
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                      Estado
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1a2d4d]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-500 text-sm">
                        No se encontraron tablets con los filtros actuales.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((tablet) => (
                      <tr key={String(tablet.id)} className="hover:bg-blue-50 dark:hover:bg-[#1a2d4d]/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 text-xs font-semibold whitespace-nowrap">
                          {tablet.codigotablet}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-slate-900 dark:text-slate-200 font-medium">
                            {tablet.alias ?? (
                              <span className="text-slate-600 italic">Sin alias</span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm whitespace-nowrap">
                          {tablet.modelo}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                          {tablet.serie}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm whitespace-nowrap">
                          {tablet.plantaNombre ?? (
                            <span className="text-slate-600 italic">Sin planta</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <EstadoBadge estado={tablet.estado} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              aria-label={`Editar ${tablet.alias ?? tablet.serie}`}
                              onClick={() => setEditTarget(tablet)}
                              className="p-1.5 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a2d4d] transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={isToggling}
                              aria-label={
                                tablet.estado === 'activa'
                                  ? `Desactivar ${tablet.alias ?? tablet.serie}`
                                  : `Activar ${tablet.alias ?? tablet.serie}`
                              }
                              onClick={() => toggleEstado(tablet)}
                              className="p-1.5 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a2d4d] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {isToggling ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="shrink-0 flex items-center justify-between gap-3 pt-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mostrando{' '}
                <span className="font-medium text-slate-900 dark:text-white">
                  {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}
                </span>{' '}
                de{' '}
                <span className="font-medium text-slate-900 dark:text-white">{filtered.length}</span>{' '}
                registros
              </p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Página anterior"
                  className="flex items-center justify-center h-8 w-8 rounded-lg border border-blue-200 dark:border-[#1a2d4d] text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Página siguiente"
                  className="flex items-center justify-center h-8 w-8 rounded-lg border border-blue-200 dark:border-[#1a2d4d] text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
