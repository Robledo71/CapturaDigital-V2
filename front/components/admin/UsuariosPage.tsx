'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Pencil, Power, AlertTriangle } from 'lucide-react'
import { NuevoUsuarioModal } from './NuevoUsuarioModal'
import { EditarUsuarioModal } from './EditarUsuarioModal'
import type { UsuarioRow } from '@/shared/types/usuario'
import type { PlantaRow } from '@/shared/types/planta'

// ─── Types ────────────────────────────────────────────────────────────────────

type UserRol = 'admin' | 'supervisor' | 'capturacion' | 'lider'
type UserEstado = 'activo' | 'inactivo'

interface Usuario {
  id: number
  nombre: string
  codigo: string
  puesto: string
  rol: UserRol
  plantaId: number | null
  plantaNombre: string | null
  estado: UserEstado
  correo: string
}

type TabKey = 'todos' | UserRol | 'inactivos'

interface TabConfig {
  key: TabKey
  label: string
  count: number
}

interface ConfirmTarget {
  user: Usuario
  action: 'desactivar' | 'activar'
}

interface UsuariosPageProps {
  initialUsuarios: UsuarioRow[]
  plantas: PlantaRow[]
  currentUserId: string | number
  total: number
  page: number
  pageSize: number
}

// ─── Mapper (outside component for stable reference) ──────────────────────────

function mapRow(u: UsuarioRow): Usuario {
  return {
    id: u.id,
    nombre: u.nombreCompleto,
    codigo: u.codigoEmpleado,
    puesto: u.puesto,
    rol: u.rol as UserRol,
    plantaId: u.plantaId ?? null,
    plantaNombre: u.plantaNombre ?? null,
    estado: u.isActive ? 'activo' : 'inactivo',
    correo: u.correo,
  }
}

// ─── Blocking rules ────────────────────────────────────────────────────────────

function canToggle(
  user: Usuario,
  usuarios: Usuario[],
  currentUserId: string | number,
): { allowed: boolean; reason?: string } {
  // Rule 1: an admin cannot deactivate their own account
  // eslint-disable-next-line eqeqeq
  if (user.id == currentUserId) {
    return { allowed: false, reason: 'No puedes desactivar tu propia cuenta' }
  }
  // Rule 2: the last active admin cannot be deactivated
  if (user.rol === 'admin' && user.estado === 'activo') {
    const activeAdmins = usuarios.filter(
      (u) => u.rol === 'admin' && u.estado === 'activo',
    )
    if (activeAdmins.length <= 1) {
      return {
        allowed: false,
        reason: 'No se puede desactivar al último administrador activo',
      }
    }
  }
  return { allowed: true }
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function RolBadge({ rol }: { rol: UserRol }) {
  if (rol === 'admin') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-300 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20">
        Administrador
      </span>
    )
  }
  if (rol === 'supervisor') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20">
        Supervisor
      </span>
    )
  }
  if (rol === 'lider') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-300 dark:bg-yellow-500/10 dark:text-yellow-300 dark:border-yellow-500/20">
        Líder
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700 border border-violet-300 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20">
      Capturación
    </span>
  )
}

function EstadoBadge({ estado }: { estado: UserEstado }) {
  if (estado === 'activo') {
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

function ConfirmModal({
  target,
  onConfirm,
  onCancel,
}: {
  target: ConfirmTarget
  onConfirm: () => void
  onCancel: () => void
}) {
  const isDeactivate = target.action === 'desactivar'
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="bg-white dark:bg-[#0c1829] border border-slate-100 dark:border-[#1a2d4d] rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-amber-400" aria-hidden="true" />
          </div>
          <div>
            <h3 id="modal-title" className="text-slate-900 dark:text-white font-semibold text-sm">
              {isDeactivate ? 'Desactivar usuario' : 'Activar usuario'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{target.user.nombre}</p>
          </div>
        </div>
        <p className="text-slate-700 dark:text-slate-300 text-sm mb-6">
          {isDeactivate
            ? `¿Desactivar a ${target.user.nombre}? No podrá iniciar sesión. Esta acción puede revertirse.`
            : `¿Activar a ${target.user.nombre}? Podrá iniciar sesión nuevamente.`}
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
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              isDeactivate
                ? 'bg-red-500/80 hover:bg-red-500 text-white'
                : 'bg-green-600/80 hover:bg-green-600 text-white'
            }`}
          >
            {isDeactivate ? 'Sí, desactivar' : 'Sí, activar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function UsuariosPage({ initialUsuarios, plantas, currentUserId, total, page, pageSize }: UsuariosPageProps) {
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<Usuario[]>(() => initialUsuarios.map(mapRow))
  const [activeTab, setActiveTab] = useState<TabKey>('todos')
  const [search, setSearch] = useState('')
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null)
  const [showNuevoModal, setShowNuevoModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Usuario | null>(null)
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  })

  // Sync when the server sends a new page of data
  useEffect(() => {
    setUsuarios(initialUsuarios.map(mapRow))
  }, [initialUsuarios])

  // Auto-dismiss toast after 3 s
  useEffect(() => {
    if (!toast.visible) return
    const t = setTimeout(
      () => setToast((prev) => ({ ...prev, visible: false })),
      3000,
    )
    return () => clearTimeout(t)
  }, [toast.visible])

  function requestToggle(user: Usuario) {
    const { allowed } = canToggle(user, usuarios, currentUserId)
    if (!allowed) return
    setConfirmTarget({
      user,
      action: user.estado === 'activo' ? 'desactivar' : 'activar',
    })
  }

  function confirmToggle() {
    if (!confirmTarget) return
    setUsuarios((prev) =>
      prev.map((u) =>
        u.id === confirmTarget.user.id
          ? { ...u, estado: u.estado === 'activo' ? 'inactivo' : 'activo' }
          : u,
      ),
    )
    setConfirmTarget(null)
  }

  function onUserCreated(newUser: UsuarioRow) {
    setUsuarios((prev) => [mapRow(newUser), ...prev])
    setShowNuevoModal(false)
    setToast({ message: 'Usuario creado correctamente', visible: true })
    router.refresh()
  }

  function onUserUpdated(updated: UsuarioRow) {
    setUsuarios((prev) =>
      prev.map((u) => (u.id === updated.id ? mapRow(updated) : u)),
    )
    setEditTarget(null)
    setToast({ message: 'Usuario actualizado correctamente', visible: true })
    router.refresh()
  }

  const tabs: TabConfig[] = [
    { key: 'todos',       label: 'Todos',           count: usuarios.length },
    { key: 'admin',       label: 'Administradores', count: usuarios.filter((u) => u.rol === 'admin').length },
    { key: 'supervisor',  label: 'Supervisores',    count: usuarios.filter((u) => u.rol === 'supervisor').length },
    { key: 'lider',       label: 'Líderes',        count: usuarios.filter((u) => u.rol === 'lider').length },
    { key: 'capturacion', label: 'Capturación',     count: usuarios.filter((u) => u.rol === 'capturacion').length },
    { key: 'inactivos',   label: 'Inactivos',       count: usuarios.filter((u) => u.estado === 'inactivo').length },
  ]

  const filtered = usuarios.filter((u) => {
    const matchTab =
      activeTab === 'todos'
        ? true
        : activeTab === 'inactivos'
        ? u.estado === 'inactivo'
        : u.rol === activeTab
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      u.nombre.toLowerCase().includes(q) ||
      u.codigo.toLowerCase().includes(q) ||
      (u.plantaNombre?.toLowerCase().includes(q) ?? false)
    return matchTab && matchSearch
  })

  return (
    <>
      {/* ConfirmModal para toggle de estado */}
      {confirmTarget && (
        <ConfirmModal
          target={confirmTarget}
          onConfirm={confirmToggle}
          onCancel={() => setConfirmTarget(null)}
        />
      )}

      {/* Modal de creación de usuario */}
      {showNuevoModal && (
        <NuevoUsuarioModal
          plantas={plantas}
          onClose={() => setShowNuevoModal(false)}
          onSuccess={onUserCreated}
        />
      )}

      {/* Modal de edición de usuario */}
      {editTarget && (
        <EditarUsuarioModal
          usuario={editTarget}
          plantas={plantas}
          onClose={() => setEditTarget(null)}
          onSuccess={onUserUpdated}
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
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Gestión de usuarios</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {usuarios.length} usuarios registrados
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
                  aria-label="Buscar usuarios"
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
                Nuevo usuario
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div
            role="tablist"
            aria-label="Filtrar por tipo"
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
          <div className="rounded-xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-[#1a2d4d] dark:shadow-none bg-white dark:bg-[#0c1829] overflow-hidden" aria-label={`Página ${page} de usuarios`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Tabla de usuarios">
                <thead>
                  <tr className="border-b border-blue-200 dark:border-[#1a2d4d]">
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Nombre
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Código
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Puesto
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Rol
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Planta
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Estado
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2d4d]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-500 text-sm">
                        No se encontraron usuarios con los filtros actuales.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((user) => {
                      const toggle = canToggle(user, usuarios, currentUserId)
                      return (
                        <tr key={user.id} className="hover:bg-blue-50 dark:hover:bg-[#1a2d4d]/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0"
                                aria-hidden="true"
                              >
                                <span className="text-white text-xs font-bold">
                                  {user.nombre.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                                </span>
                              </div>
                              <span className="text-slate-900 dark:text-slate-200 font-medium">{user.nombre}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                            {user.codigo}
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm whitespace-nowrap">
                            {user.puesto}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <RolBadge rol={user.rol} />
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm whitespace-nowrap">
                            {user.plantaNombre ?? '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <EstadoBadge estado={user.estado} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                aria-label={`Editar ${user.nombre}`}
                                onClick={() => setEditTarget(user)}
                                className="p-1.5 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                aria-label={
                                  user.estado === 'activo'
                                    ? `Desactivar ${user.nombre}`
                                    : `Activar ${user.nombre}`
                                }
                                title={toggle.reason}
                                disabled={!toggle.allowed}
                                onClick={() => requestToggle(user)}
                                className={`p-1.5 rounded transition-colors ${
                                  toggle.allowed
                                    ? 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-[#1a2d4d]'
                                    : 'text-slate-700 cursor-not-allowed'
                                }`}
                              >
                                <Power size={14} />
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
