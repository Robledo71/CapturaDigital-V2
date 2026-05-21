'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { BandejaReporteRow } from '@/back/services/dashboardService'
import { useRouter } from 'next/navigation'

interface QualityTableProps {
  rows: BandejaReporteRow[]
}

export function QualityTable({ rows }: QualityTableProps) {
  const router = useRouter()
  return (
    <div className="rounded-xl bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:bg-[#0f2038] dark:border-[#1a2d4d] dark:shadow-none p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-slate-900 dark:text-white font-semibold text-sm">Bandeja de Reportes</span>
          <span className="text-slate-500 text-xs">Reportes enviados por inspectores</span>
        </div>
        <Link
          href="/supervisor/reportes"
          className="flex items-center gap-1 text-blue-400 text-sm hover:text-blue-300 transition-colors"
        >
          Ver todos
          <ChevronRight size={14} />
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-blue-200 dark:border-[#1a2d4d]">
              {['REPORTE', 'CLIENTE · PLANTA', 'INSPECTOR', 'RECIBIDO', ''].map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="text-left text-xs text-slate-500 uppercase tracking-wider pb-3 pr-4 last:pr-0 font-medium"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-slate-500 text-sm py-8 text-center">
                  No hay reportes enviados pendientes de revisión.
                </td>
              </tr>
            ) : rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => router.push(`/supervisor/reportes/${row.id}`)}
                className="border-b border-blue-200 dark:border-[#1a2d4d]/50 hover:bg-blue-50 dark:hover:bg-[#1a2d4d]/50 cursor-pointer transition-colors"
              >
                {/* REPORTE */}
                <td className="py-3 pr-4">
                  <p className="text-slate-900 dark:text-white text-sm font-medium">{row.id}</p>
                  <p className="text-slate-400 dark:text-slate-400 text-xs">{row.part}</p>
                </td>

                {/* CLIENTE · PLANTA */}
                <td className="py-3 pr-4">
                  <p className="text-slate-900 dark:text-white text-sm">{row.client}</p>
                  <p className="text-slate-400 dark:text-slate-400 text-xs">{row.plant}</p>
                </td>

                {/* INSPECTOR */}
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-white dark:text-white text-xs font-medium">{row.initials}</span>
                    </div>
                    <span className="text-slate-900 dark:text-white text-sm">{row.operadores}</span>
                  </div>
                </td>

                {/* RECIBIDO */}
                <td className="py-3 pr-4">
                  <span className="text-black dark:text-slate-400 text-sm font-medium">{row.time}</span>
                </td>

                {/* Arrow */}
                <td className="py-3">
                  <ChevronRight size={16} className="text-slate-500" />
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>
    </div>
  )
}
