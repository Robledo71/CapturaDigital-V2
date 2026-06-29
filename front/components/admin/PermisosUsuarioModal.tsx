'use client'

import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Loader2, X } from 'lucide-react'
import {
  getUserPermisosAction,
  updateUserPermisosAction,
} from '@/app/actions/update-user-permisos'
import type { UserPermisoItem } from '@/back/services/permisosService'

interface PermisosUsuarioModalProps {
  user: { id: number; nombre: string; rol: string }
  onClose: () => void
}

const MODULO_LABEL: Record<string, string> = {
  reportes: 'Reportes',
  cotizaciones: 'Cotizaciones',
  ordenes: 'Órdenes',
  tablets: 'Tablets',
  usuarios: 'Usuarios',
  clientes: 'Clientes',
  plantas: 'Plantas',
  secciones: 'Acceso a secciones',
  meta: 'Configuración',
}

const ROL_LABEL: Record<string, string> = {
  supervisor: 'Supervisor',
  lider: 'Líder',
  capturacion: 'Capturación',
  servicio_cliente: 'Servicio al Cliente',
  gerente: 'Gerencia',
}

export function PermisosUsuarioModal({ user, onClose }: PermisosUsuarioModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [permisos, setPermisos] = useState<UserPermisoItem[]>([])
  // Claves revocadas (desmarcadas). Estado de trabajo del modal.
  const [revoked, setRevoked] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getUserPermisosAction(user.id).then((res) => {
      if (cancelled) return
      if (res.ok) {
        setPermisos(res.data.permisos)
        setRevoked(new Set(res.data.revoked))
      } else {
        setError(res.error)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [user.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const grouped = useMemo(() => {
    const groups: { modulo: string; items: UserPermisoItem[] }[] = []
    for (const p of permisos) {
      let g = groups.find((x) => x.modulo === p.modulo)
      if (!g) {
        g = { modulo: p.modulo, items: [] }
        groups.push(g)
      }
      g.items.push(p)
    }
    return groups
  }, [permisos])

  const allowedCount = permisos.length - revoked.size

  function toggle(key: string) {
    setRevoked((prev) => {
      // Si la acción va a REVOCAR (agregar a revoked) y ya queda solo 1 permitido, bloquearlo.
      if (!prev.has(key) && allowedCount <= 1) return prev
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const res = await updateUserPermisosAction(user.id, [...revoked])
    setSaving(false)
    if (res.ok) onClose()
    else setError(res.error)
  }

  const revokedCount = revoked.size

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Permisos de ${user.nombre}`}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white dark:bg-[#0c1829] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-700 px-5 py-4 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400" />
              Permisos de {user.nombre}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Rol {ROL_LABEL[user.rol] ?? user.rol} · desmarca lo que este usuario{' '}
              <span className="font-medium">no debe poder hacer</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a2d4d] flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
              <Loader2 size={18} className="animate-spin" /> Cargando permisos…
            </div>
          ) : error ? (
            <div className="rounded-lg bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800 px-4 py-3 text-sm">
              {error}
            </div>
          ) : permisos.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Este rol no tiene permisos configurables.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {grouped.map((group) => (
                <div key={group.modulo}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    {MODULO_LABEL[group.modulo] ?? group.modulo}
                  </p>
                  <div className="flex flex-col gap-1">
                    {group.items.map((p) => {
                      const allowed = !revoked.has(p.key)
                      const isLastAllowed = allowed && allowedCount === 1
                      return (
                        <label
                          key={p.key}
                          className={`flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-[#0f2138] ${isLastAllowed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <input
                            type="checkbox"
                            checked={allowed}
                            onChange={() => toggle(p.key)}
                            disabled={isLastAllowed}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                          />
                          <span className="min-w-0">
                            <span
                              className={
                                allowed
                                  ? 'text-sm text-slate-700 dark:text-slate-200'
                                  : 'text-sm text-slate-400 line-through'
                              }
                            >
                              {p.descripcion || p.key}
                            </span>
                            <span className="block text-[11px] font-mono text-slate-400">{p.key}</span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-700 px-5 py-3 flex-shrink-0">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {revokedCount > 0
                ? `${revokedCount} permiso${revokedCount > 1 ? 's' : ''} retirado${revokedCount > 1 ? 's' : ''} · aplica al próximo login`
                : 'Sin restricciones · igual que su rol'}
            </span>
            <span
              className={`text-xs ${
                allowedCount === 1
                  ? 'text-amber-600 dark:text-amber-400 font-medium'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Debe quedar al menos un permiso activo.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1a2d4d] disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || saving || !!error}
              className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
