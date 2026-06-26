'use client'

import { useMemo, useState } from 'react'
import { ShieldCheck, Loader2, Check } from 'lucide-react'
import { updateRolePermisosAction } from '@/app/actions/update-role-permisos'
import type { PermisoCatalogo } from '@/back/services/permisosService'

interface PermisosMatrixProps {
  permissions: PermisoCatalogo[]
  matrix: Record<string, string[]>
  editableRoles: string[]
}

const ROL_LABEL: Record<string, string> = {
  admin: 'Acceso total',
  supervisor: 'Supervisor',
  lider: 'Líder',
  capturacion: 'Capturación',
  servicio_cliente: 'Servicio al Cliente',
  cliente: 'Cliente',
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

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

type Feedback = { type: 'ok' | 'error'; text: string } | null

export function PermisosMatrix({ permissions, matrix, editableRoles }: PermisosMatrixProps) {
  // Columnas: admin (read-only, acceso total) + roles editables.
  const columns = useMemo(() => ['admin', ...editableRoles], [editableRoles])

  // Permisos agrupados por módulo, respetando el orden del catálogo.
  const grouped = useMemo(() => {
    const groups: { modulo: string; permisos: PermisoCatalogo[] }[] = []
    for (const p of permissions) {
      let g = groups.find((x) => x.modulo === p.modulo)
      if (!g) {
        g = { modulo: p.modulo, permisos: [] }
        groups.push(g)
      }
      g.permisos.push(p)
    }
    return groups
  }, [permissions])

  const initial = useMemo<Record<string, Set<string>>>(() => {
    const out: Record<string, Set<string>> = {}
    for (const rol of editableRoles) out[rol] = new Set(matrix[rol] ?? [])
    return out
  }, [editableRoles, matrix])

  const [selected, setSelected] = useState<Record<string, Set<string>>>(() => {
    const out: Record<string, Set<string>> = {}
    for (const rol of editableRoles) out[rol] = new Set(matrix[rol] ?? [])
    return out
  })
  const [baseline, setBaseline] = useState<Record<string, Set<string>>>(initial)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const dirtyRoles = useMemo(
    () => editableRoles.filter((rol) => !setsEqual(selected[rol], baseline[rol])),
    [editableRoles, selected, baseline],
  )

  function isChecked(rol: string, key: string): boolean {
    if (rol === 'admin') return true // admin = acceso total (read-only)
    return selected[rol]?.has(key) ?? false
  }

  function toggle(rol: string, key: string) {
    if (rol === 'admin') return
    setSelected((prev) => {
      const next = new Set(prev[rol])
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return { ...prev, [rol]: next }
    })
    setFeedback(null)
  }

  async function handleSave() {
    if (dirtyRoles.length === 0) return
    setSaving(true)
    setFeedback(null)

    const failed: string[] = []
    const savedBaseline = { ...baseline }

    for (const rol of dirtyRoles) {
      const res = await updateRolePermisosAction(rol, [...selected[rol]])
      if (res.ok) {
        savedBaseline[rol] = new Set(res.permisos)
      } else {
        failed.push(`${ROL_LABEL[rol] ?? rol}: ${res.error}`)
      }
    }

    setBaseline(savedBaseline)
    // Re-sincroniza la selección con lo que realmente quedó persistido.
    setSelected((prev) => {
      const out: Record<string, Set<string>> = {}
      for (const rol of editableRoles) out[rol] = new Set(savedBaseline[rol] ?? prev[rol])
      return out
    })

    setSaving(false)
    if (failed.length === 0) {
      setFeedback({ type: 'ok', text: 'Cambios guardados.' })
    } else {
      setFeedback({ type: 'error', text: `No se pudieron guardar: ${failed.join(' · ')}` })
    }
  }

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Encabezado */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck size={20} className="text-blue-600 dark:text-blue-400" />
              Roles y permisos
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Marca qué puede hacer cada rol. Los cambios aplican en el{' '}
              <span className="font-medium">próximo inicio de sesión</span> del usuario.
              El rol <span className="font-medium">Acceso total</span> no es editable.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {dirtyRoles.length > 0 && !saving && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                {dirtyRoles.length} rol{dirtyRoles.length > 1 ? 'es' : ''} sin guardar
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={dirtyRoles.length === 0 || saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Guardar cambios
            </button>
          </div>
        </div>

        {feedback && (
          <div
            role="status"
            className={
              feedback.type === 'ok'
                ? 'mb-4 rounded-lg px-4 py-2 text-sm bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
                : 'mb-4 rounded-lg px-4 py-2 text-sm bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
            }
          >
            {feedback.text}
          </div>
        )}

        {/* Matriz */}
        <div className="overflow-x-auto scrollbar-thin rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1829]">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left font-bold text-black dark:text-white px-4 py-3 whitespace-nowrap">
                  Permiso
                </th>
                {columns.map((rol) => (
                  <th
                    key={rol}
                    className="px-3 py-3 text-center font-bold text-black dark:text-white whitespace-nowrap min-w-[7rem]"
                  >
                    {ROL_LABEL[rol] ?? rol}
                    {rol === 'admin' && (
                      <span className="block text-[10px] font-normal text-slate-400">(fijo)</span>
                    )}
                    {dirtyRoles.includes(rol) && (
                      <span className="block text-[10px] font-normal text-amber-500">● sin guardar</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped.map((group) => (
                <FragmentGroup
                  key={group.modulo}
                  group={group}
                  columns={columns}
                  isChecked={isChecked}
                  toggle={toggle}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function FragmentGroup({
  group,
  columns,
  isChecked,
  toggle,
}: {
  group: { modulo: string; permisos: PermisoCatalogo[] }
  columns: string[]
  isChecked: (rol: string, key: string) => boolean
  toggle: (rol: string, key: string) => void
}) {
  return (
    <>
      <tr className="bg-slate-50 dark:bg-[#0f2138]">
        <td
          colSpan={columns.length + 1}
          className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap"
        >
          {MODULO_LABEL[group.modulo] ?? group.modulo}
        </td>
      </tr>
      {group.permisos.map((p) => (
        <tr
          key={p.key}
          className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-[#0f2138]/60"
        >
          <td className="px-4 py-2.5 whitespace-nowrap">
            <div className="text-slate-700 dark:text-slate-200">{p.descripcion || p.key}</div>
            <div className="text-[11px] text-slate-400 font-mono">{p.key}</div>
          </td>
          {columns.map((rol) => {
            const checked = isChecked(rol, p.key)
            const readOnly = rol === 'admin'
            return (
              <td key={rol} className="px-3 py-2.5 text-center">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={readOnly}
                  onChange={() => toggle(rol, p.key)}
                  aria-label={`${rol} — ${p.key}`}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 cursor-pointer disabled:cursor-default"
                />
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}
