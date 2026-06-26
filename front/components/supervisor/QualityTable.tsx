'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { BandejaReporteRow } from '@/back/services/dashboardService'
import { useRouter } from 'next/navigation'
import { getAvatarColor } from '@/front/lib/avatarColor'

interface QualityTableProps {
  rows: BandejaReporteRow[]
}

export function QualityTable({ rows }: QualityTableProps) {
  const router = useRouter()
  return (
    <div className="rounded-xl bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:bg-[#0f2038] dark:border-[#0f2038] dark:shadow-none p-5 flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex flex-col gap-0.5">
          <span className="text-slate-900 dark:text-white font-semibold text-sm">
            Bandeja de Reportes
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            Reportes enviados por inspectores
          </span>
        </div>
        <Link
          href="/supervisor/reportes"
          className="flex items-center gap-1 text-blue-500 dark:text-blue-400 text-sm hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
        >
          Ver todos
          <ChevronRight size={14} />
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/30 border-b border-slate-200 dark:border-[#1a2d4d]">
              {['COTIZACIÓN', 'CLIENTE · PLANTA', 'INSPECTOR', 'RECIBIDO', ''].map((col, idx) => (
                <th
                  key={idx}
                  scope="col"
                  className="text-left text-[10px] font-bold uppercase tracking-wider text-black dark:text-white py-2.5 pr-4 last:pr-0 first:pl-3 last:pl-0"
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
                className="group border-b border-slate-100 dark:border-[#1a2d4d]/50 hover:bg-blue-50 dark:hover:bg-[#1a2d4d]/50 cursor-pointer transition-colors"
              >
                {/* COTIZACIÓN */}
                <td className="py-3 pr-4 pl-3">
                  <p className="text-slate-900 dark:text-white text-sm font-medium font-mono">{row.cotizacion}</p>
                  <p className="text-slate-400 text-xs">{row.part}</p>
                </td>

                {/* CLIENTE · PLANTA */}
                <td className="py-3 pr-4">
                  <p className="text-slate-900 dark:text-white text-sm">{row.client}</p>
                  <p className="text-slate-400 text-xs">{row.plant}</p>
                </td>

                {/* INSPECTOR */}
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full ${getAvatarColor(row.operadores)} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white text-xs font-medium">{row.initials}</span>
                    </div>
                    <span className="text-slate-900 dark:text-white text-sm">{row.operadores}</span>
                  </div>
                </td>

                {/* RECIBIDO */}
                <td className="py-3 pr-4">
                  <span className="text-slate-700 dark:text-slate-400 text-sm font-medium">{row.time}</span>
                </td>

                {/* Arrow with slide micro-animation */}
                <td className="py-3">
                  <ChevronRight
                    size={16}
                    className="text-slate-400 dark:text-slate-500 transition-transform duration-150 group-hover:translate-x-1"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
