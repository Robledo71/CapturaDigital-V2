'use client'

import { useState, useEffect, useActionState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Pencil, Trash2, AlertTriangle, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react'

const PAGE_SIZE = 12
import { NuevoClienteModal } from './NuevoClienteModal'
import { EditarClienteModal } from './EditarClienteModal'
import { NuevoUsuarioClienteModal } from './NuevoUsuarioClienteModal'
import { deleteClienteAction } from '@/app/actions/delete-cliente'
import type { ClienteRow } from '@/shared/types/cliente'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ClientesPageProps {
  initialClientes: ClienteRow[]
}

// ─── Delete row — isolated so each row has its own useActionState ─────────────

interface DeleteRowProps {
  cliente: ClienteRow
  onDeleted: (id: number) => void
  onEditClick: (cliente: ClienteRow) => void
  onCrearUsuarioClick: (cliente: ClienteRow) => void
}

// Modal de confirmación de borrado (mismo patrón que el de desactivar usuario).
function ConfirmDeleteClienteModal({
  nombre,
  clienteId,
  dispatch,
  error,
  onCancel,
}: {
  nombre: string
  clienteId: number
  dispatch: (formData: FormData) => void
  error?: string
  onCancel: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-del-cliente-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-[#0c1829] border border-slate-100 dark:border-[#1a2d4d] rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 animate-scale-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-red-400" aria-hidden="true" />
          </div>
          <div>
            <h3 id="modal-del-cliente-title" className="text-slate-900 dark:text-white font-semibold text-sm">
              Eliminar cliente
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{nombre}</p>
          </div>
        </div>
        <p className="text-slate-700 dark:text-slate-300 text-sm mb-6">
          ¿Eliminar a {nombre}? Esta acción no se puede deshacer.
        </p>
        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-blue-200 dark:border-[#1a2d4d] text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors"
          >
            Cancelar
          </button>
          <form action={dispatch}>
            <input type="hidden" name="id" value={String(clienteId)} />
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded-lg font-medium bg-red-500/80 hover:bg-red-500 text-white transition-colors"
            >
              Sí, eliminar
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function ClienteTableRow({ cliente, onDeleted, onEditClick, onCrearUsuarioClick }: DeleteRowProps) {
  const [confirming, setConfirming] = useState(false)
  const [state, dispatch] = useActionState(deleteClienteAction, undefined)

  useEffect(() => {
    if (state?.ok) {
      onDeleted(cliente.id)
    }
  }, [state])

  return (
    <tr className="h-14 hover:bg-blue-50 dark:hover:bg-[#1a2d4d]/40 transition-colors">
      {/* Nombre */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-700 dark:text-white text-xs font-bold"
            aria-hidden="true"
          >
            {cliente.nombre.charAt(0).toUpperCase()}
          </div>
          <span className="text-slate-900 dark:text-slate-200 font-medium">
            {cliente.nombre}
          </span>
        </div>
      </td>

      {/* RFC */}
      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">
        {cliente.rfc || <span className="text-slate-400 dark:text-slate-600 italic font-sans">Sin RFC</span>}
      </td>

      {/* Usuario asignado */}
      <td className="px-4 py-3 text-sm">
        {cliente.usuarioCodigo ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-900 dark:text-slate-200 font-medium">
              {cliente.usuarioCodigo}
            </span>
            {cliente.usuarioCorreo && (
              <span className="text-slate-500 dark:text-slate-400 text-xs">
                {cliente.usuarioCorreo}
              </span>
            )}
          </div>
        ) : (
          <span className="text-slate-500 italic text-xs">Sin usuario</span>
        )}
      </td>

      {/* Acciones */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          {cliente.usuarioId === null && (
            <button
              type="button"
              aria-label={`Crear usuario para ${cliente.nombre}`}
              onClick={() => onCrearUsuarioClick(cliente)}
              className="p-1.5 rounded text-slate-500 hover:text-purple-400 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors"
              title="Crear usuario para este cliente"
            >
              <UserPlus size={14} />
            </button>
          )}
          <button
            type="button"
            aria-label={`Editar ${cliente.nombre}`}
            onClick={() => onEditClick(cliente)}
            className="p-1.5 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            aria-label={`Eliminar ${cliente.nombre}`}
            onClick={() => setConfirming(true)}
            className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {confirming && (
          <ConfirmDeleteClienteModal
            nombre={cliente.nombre}
            clienteId={cliente.id}
            dispatch={dispatch}
            error={state?.error}
            onCancel={() => setConfirming(false)}
          />
        )}
      </td>
    </tr>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ClientesPage({ initialClientes }: ClientesPageProps) {
  const router = useRouter()
  const [clientes, setClientes] = useState<ClienteRow[]>(initialClientes)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showNuevoModal, setShowNuevoModal] = useState(false)
  const [editTarget, setEditTarget] = useState<ClienteRow | null>(null)
  const [usuarioTarget, setUsuarioTarget] = useState<ClienteRow | null>(null)
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  })

  // Sync when the server sends fresh data (e.g. after revalidatePath)
  useEffect(() => {
    setClientes(initialClientes)
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
    setClientes((prev) => [c, ...prev])
    setShowNuevoModal(false)
    setToast({ message: 'Cliente creado correctamente', visible: true })
    // revalidatePath en la server action ya dispara el re-render del servidor
  }

  function onClienteActualizado(c: ClienteRow) {
    setClientes((prev) => prev.map((item) => (item.id === c.id ? c : item)))
    setEditTarget(null)
    setToast({ message: 'Cliente actualizado correctamente', visible: true })
  }

  function onUsuarioCreado() {
    setUsuarioTarget(null)
    setToast({ message: 'Usuario creado correctamente', visible: true })
  }

  function onClienteEliminado(id: number) {
    setClientes((prev) => prev.filter((item) => item.id !== id))
    setToast({ message: 'Cliente eliminado correctamente', visible: true })
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return clientes.filter(
      (c) =>
        !q ||
        c.nombre.toLowerCase().includes(q) ||
        c.rfc.toLowerCase().includes(q) ||
        (c.usuarioCodigo ?? '').toLowerCase().includes(q) ||
        (c.usuarioCorreo ?? '').toLowerCase().includes(q),
    )
  }, [clientes, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

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

      {/* Modal de creación de usuario para cliente */}
      {usuarioTarget && (
        <NuevoUsuarioClienteModal
          cliente={usuarioTarget}
          onClose={() => setUsuarioTarget(null)}
          onSuccess={onUsuarioCreado}
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
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Clientes</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {clientes.length} {clientes.length === 1 ? 'cliente registrado' : 'clientes registrados'}
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
                  onChange={(e) => handleSearch(e.target.value)}
                  aria-label="Buscar clientes"
                  className="pl-9 pr-4 py-2 text-sm rounded-lg bg-white dark:bg-[#0c1829] border border-blue-200 dark:border-[#1a2d4d] text-slate-800 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 w-full sm:w-52 transition-colors"
                />
              </div>
              {/* Add button */}
              <button
                type="button"
                onClick={() => setShowNuevoModal(true)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap"
              >
                <Plus size={15} />
                Nuevo cliente
              </button>
            </div>
          </div>

          {/* Table */}
          <div
            className="shrink-0 rounded-xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-[#0c1829] dark:shadow-none bg-white dark:bg-[#0c1829] overflow-hidden"
          >
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm" aria-label="Tabla de clientes">
                <thead>
                  <tr className="h-14 border-b border-slate-100 dark:border-[#1a2d4d]">
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap"
                    >
                      Nombre
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap"
                    >
                      RFC
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap"
                    >
                      Usuario asignado
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-bold text-black dark:text-white uppercase tracking-wider"
                    >
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1a2d4d]">
                  {paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-12 text-center text-slate-500 text-sm"
                      >
                        No se encontraron clientes.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((cliente) => (
                      <ClienteTableRow
                        key={String(cliente.id)}
                        cliente={cliente}
                        onDeleted={onClienteEliminado}
                        onEditClick={setEditTarget}
                        onCrearUsuarioClick={setUsuarioTarget}
                      />
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
