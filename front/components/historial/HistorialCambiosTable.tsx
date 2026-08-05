'use client'

import { useState } from 'react'
import { ChevronRight, Search } from 'lucide-react'
import type { EditHistoryRow } from '@/back/services/editHistoryService'
import { HistorialDetalleModal } from './HistorialDetalleModal'
import { HistorialCardList } from './HistorialCardList'
import { OfflineBanner } from '@/front/components/ui/OfflineBanner'

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
    <div className="flex flex-1 flex-col overflow-hidden p-4 sm:p-6 gap-4">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Historial de cambios</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {rows.length} {rows.length === 1 ? 'registro' : 'registros'}
        </p>
      </div>

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
      </div>

      {/* Table (desktop) */}
      <div className="hidden md:block rounded-xl border border-slate-100 dark:border-[#0c1829] bg-white dark:bg-[#0c1829] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 px-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">Sin cambios registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#1a2d4d]">
                <th className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                  Reporte
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                  Ítem
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                  Motivo
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                  Fecha
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                  <span className="sr-only">Abrir</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1a2d4d]">
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setSelected(row)}
                  className="group hover:bg-blue-50 dark:hover:bg-[#1a2d4d]/40 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    #{row.dailyReportConsecutive}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                    {row.reportItemId ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900 dark:text-white whitespace-nowrap">
                    {row.usuario}
                  </td>
                  <td className="px-4 py-3 max-w-[320px]">
                    <span
                      className="block truncate text-sm text-slate-700 dark:text-slate-300"
                      title={row.motivo}
                    >
                      {row.motivo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">
                    {formatFecha(row.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight
                      size={15}
                      className="inline text-blue-400 transition-colors group-hover:text-slate-600 dark:text-slate-400"
                      aria-hidden="true"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Cards (mobile) */}
      <div className="md:hidden flex flex-col gap-3">
        <OfflineBanner />
        <HistorialCardList rows={filtered} onRowClick={setSelected} formatFecha={formatFecha} />
      </div>

      {selected && (
        <HistorialDetalleModal registro={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
