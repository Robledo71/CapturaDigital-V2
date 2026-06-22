'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import type { EditHistoryRow } from '@/back/services/editHistoryService'
import { HistorialDetalleModal } from './HistorialDetalleModal'

interface HistorialCambiosTableProps {
  rows: EditHistoryRow[]
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function HistorialCambiosTable({ rows }: HistorialCambiosTableProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<EditHistoryRow | null>(null)

  const filtered = query.trim()
    ? rows.filter((row) => {
        const q = query.toLowerCase()
        return (
          row.usuario.toLowerCase().includes(q) ||
          row.motivo.toLowerCase().includes(q) ||
          String(row.dailyReportConsecutive).includes(q)
        )
      })
    : rows

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-6 gap-4">
      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs w-full">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por usuario, motivo o reporte..."
            className="w-full rounded-lg border border-slate-300 bg-white dark:border-[#1a2d4d] dark:bg-[#0c1829] pl-8 pr-3 py-2 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
          />
        </div>
        <span className="text-xs text-slate-500 tabular-nums">
          {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-100 dark:border-[#1a2d4d] bg-white dark:bg-[#0c1829] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 px-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">Sin cambios registrados</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-200 dark:border-[#1a2d4d]">
                <th className="px-5 pb-3 pt-4 text-left text-xs font-medium text-slate-600 dark:text-slate-500">
                  Reporte
                </th>
                <th className="px-5 pb-3 pt-4 text-left text-xs font-medium text-slate-600 dark:text-slate-500">
                  Ítem
                </th>
                <th className="px-5 pb-3 pt-4 text-left text-xs font-medium text-slate-600 dark:text-slate-500">
                  Usuario
                </th>
                <th className="px-5 pb-3 pt-4 text-left text-xs font-medium text-slate-600 dark:text-slate-500">
                  Motivo
                </th>
                <th className="px-5 pb-3 pt-4 text-right text-xs font-medium text-slate-600 dark:text-slate-500">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setSelected(row)}
                  className="border-b border-blue-100 dark:border-[#1a2d4d]/50 last:border-0 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3 text-xs font-mono text-blue-600 dark:text-blue-400">
                    #{row.dailyReportConsecutive}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {row.reportItemId ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-900 dark:text-white">
                    {row.usuario}
                  </td>
                  <td className="px-5 py-3 max-w-[320px]">
                    <span
                      className="block truncate text-sm text-slate-700 dark:text-slate-300"
                      title={row.motivo}
                    >
                      {row.motivo}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">
                    {formatFecha(row.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <HistorialDetalleModal registro={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
