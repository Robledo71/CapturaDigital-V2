'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Pencil, Trash2 } from 'lucide-react'
import { NuevoClienteModal } from './NuevoClienteModal'
import { EditarClienteModal } from './EditarClienteModal'
import type { ClienteRow } from '@/shared/types/cliente'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Cliente {
  id: number
  nombre: string
  direccion: string | null
  requiereOC: boolean
  ordenesActivas: number
}

interface ClientesPageProps {
  initialClientes: ClienteRow[]
  total: number
  page: number
  pageSize: number
}

// ─── Mapper (outside component for stable reference) ──────────────────────────

function mapRow(c: ClienteRow): Cliente {
  return {
    id: c.id,
    nombre: c.nombre,
    direccion: c.direccion,
    requiereOC: c.requiereOC,
    ordenesActivas: c.ordenesActivas,
  }
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function OCBadge({ requiereOC }: { requiereOC: boolean }) {
  if (requiereOC) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20">
        Requiere OC
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-500/10 dark:text-slate-400 dark:border-transparent">
      Sin OC
    </span>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ClientesPage({ initialClientes, total, page, pageSize }: ClientesPageProps) {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>(() => initialClientes.map(mapRow))
  const [search, setSearch] = useState('')
  const [showNuevoModal, setShowNuevoModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Cliente | null>(null)
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  })

  // Sync when the server sends a new page of data
  useEffect(() => {
    setClientes(initialClientes.map(mapRow))
  }, [initialClientes])

  // Auto-dismiss toast after 3 s
  useEffect(() => {
    if (!toast.visible) return
    const t = setTimeout(
      () => setToast((prev) => ({ ...prev, visible: false })),
      3000,
    )
    return () => clearTimeout(t)
  }, [toast.visible])

  function onClienteCreado(c: ClienteRow) {
    setClientes((prev) => [mapRow(c), ...prev])
    setShowNuevoModal(false)
    setToast({ message: 'Cliente creado correctamente', visible: true })
    router.refresh()
  }

  function onClienteActualizado(c: ClienteRow) {
    setClientes((prev) =>
      prev.map((item) => (item.id === c.id ? mapRow(c) : item)),
    )
    setEditTarget(null)
    setToast({ message: 'Cliente actualizado correctamente', visible: true })
    router.refresh()
  }

  const filtered = clientes.filter((c) => {
    const q = search.toLowerCase()
    return (
      !q ||
      c.nombre.toLowerCase().includes(q) ||
      (c.direccion ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <>
      {/* Modal de creación */}
      {showNuevoModal && (
        <NuevoClienteModal
          onClose={() => setShowNuevoModal(false)}
          onSuccess={onClienteCreado}
        />
      )}

      {/* Modal de edición */}
      {editTarget && (
        <EditarClienteModal
          cliente={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={onClienteActualizado}
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
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Clientes</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {clientes.length} clientes registrados
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
                  aria-label="Buscar clientes"
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
                Nuevo cliente
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-[#1a2d4d] dark:shadow-none bg-white dark:bg-[#0c1829] overflow-hidden" aria-label={`Página ${page} de clientes`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Tabla de clientes">
                <thead>
                  <tr className="border-b border-blue-200 dark:border-[#1a2d4d]">
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Nombre
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Dirección
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Requiere OC
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
                        No se encontraron clientes con los filtros actuales.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((cliente) => (
                      <tr key={String(cliente.id)} className="hover:bg-blue-50 dark:hover:bg-[#1a2d4d]/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                              aria-hidden="true"
                            >
                              {cliente.nombre.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-slate-900 dark:text-slate-200 font-medium">{cliente.nombre}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm">
                          {cliente.direccion ?? (
                            <span className="text-slate-600 italic">Sin dirección</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <OCBadge requiereOC={cliente.requiereOC} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-slate-700 dark:text-slate-300 text-sm tabular-nums">
                            {cliente.ordenesActivas}{' '}
                            <span className="text-slate-500">
                              {cliente.ordenesActivas === 1 ? 'orden activa' : 'órdenes activas'}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              aria-label={`Editar ${cliente.nombre}`}
                              onClick={() => setEditTarget(cliente)}
                              className="p-1.5 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Eliminar ${cliente.nombre}`}
                              className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors"
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
