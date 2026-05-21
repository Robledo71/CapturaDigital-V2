'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Pencil, Power } from 'lucide-react'
import { NuevoTabletModal } from './NuevoTabletModal'
import { EditarTabletModal } from './EditarTabletModal'
import type { TabletRow } from '@/shared/types/tablet'
import type { PlantaRow } from '@/shared/types/planta'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tablet {
  id: number
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
  total: number
  page: number
  pageSize: number
}

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
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-300">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400" aria-hidden="true" />
        Activa
      </span>
    )
  }
  if (estado === 'offline') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-300">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" aria-hidden="true" />
        Offline
      </span>
    )
  }
  if (estado === 'mantenimiento') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-300">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" aria-hidden="true" />
        Mantenimiento
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-500 dark:text-slate-400">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" aria-hidden="true" />
      Inactiva
    </span>
  )
}

function InspectorCell({ inspector }: { inspector: string | null }) {
  if (!inspector) {
    return <span className="text-slate-600 text-sm italic">Sin inspector</span>
  }
  const initials = inspector
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0"
        aria-hidden="true"
      >
        <span className="text-white text-xs font-bold">{initials}</span>
      </div>
      <span className="text-slate-700 dark:text-slate-300 text-sm">{inspector}</span>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function TabletsPage({ initialTablets, plantas, total, page, pageSize }: TabletsPageProps) {
  const router = useRouter()
  const [tablets, setTablets] = useState<Tablet[]>(() => initialTablets.map(mapRow))
  const [activeTab, setActiveTab] = useState<TabKey>('todas')
  const [search, setSearch] = useState('')
  const [showNuevoModal, setShowNuevoModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Tablet | null>(null)
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  })

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

  function toggleEstado(id: number) {
    setTablets((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, estado: t.estado === 'activa' ? 'inactiva' : 'activa' }
          : t,
      ),
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
      (t.alias ?? '').toLowerCase().includes(q) ||
      t.modelo.toLowerCase().includes(q) ||
      t.serie.toLowerCase().includes(q) ||
      (t.plantaNombre ?? '').toLowerCase().includes(q) ||
      (t.inspector ?? '').toLowerCase().includes(q)
    return matchTab && matchSearch
  })

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
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Tablets</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {tablets.length} tablets registradas
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
                  aria-label="Buscar tablets"
                  className="pl-9 pr-4 py-2 text-sm rounded-lg bg-white dark:bg-[#0c1829] border border-blue-200 dark:border-[#1a2d4d] text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 w-52 transition-colors"
                />
              </div>
              {/* Add button */}
              <button
                type="button"
                onClick={() => setShowNuevoModal(true)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
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
            className="flex items-end gap-0 border-b border-blue-200 dark:border-[#1a2d4d]"
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
                        ? 'bg-blue-500/20 text-blue-300'
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
          <div className="rounded-xl border border-blue-200 dark:border-[#1a2d4d] bg-white dark:bg-[#0c1829] overflow-hidden" aria-label={`Página ${page} de tablets`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Tabla de tablets">
                <thead>
                  <tr className="border-b border-blue-200 dark:border-[#1a2d4d]">
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Alias
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Modelo
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Serie
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Planta
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Inspector actual
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Estado
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Última actividad
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1a2d4d]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-500 text-sm">
                        No se encontraron tablets con los filtros actuales.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((tablet) => (
                      <tr key={String(tablet.id)} className="hover:bg-blue-50 dark:hover:bg-[#1a2d4d]/40 transition-colors">
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
                          <InspectorCell inspector={tablet.inspector} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <EstadoBadge estado={tablet.estado} />
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                          {tablet.ultimaActividad}
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
                              aria-label={
                                tablet.estado === 'activa'
                                  ? `Desactivar ${tablet.alias ?? tablet.serie}`
                                  : `Activar ${tablet.alias ?? tablet.serie}`
                              }
                              onClick={() => toggleEstado(tablet.id)}
                              className="p-1.5 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a2d4d] transition-colors"
                            >
                              <Power size={14} />
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
                  className="px-3 py-1.5 text-sm rounded-lg border border-blue-200 dark:border-[#1a2d4d] text-blue-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                  className="px-3 py-1.5 text-sm rounded-lg border border-blue-200 dark:border-[#1a2d4d] text-blue-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
