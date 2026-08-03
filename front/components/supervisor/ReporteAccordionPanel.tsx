'use client'

import Link from 'next/link'
import { ChevronRight, Loader2 } from 'lucide-react'
import type { InspectionItemRow } from '@/back/services/reporteDetalleService'

// ─── Acordeón: detalles por número de parte ───────────────────────────────────
// Un reporte (formal o informal) pertenece a un item que puede abarcar varios
// números de parte. Cada detalle (captura.detalles_reporte_diario) apunta al
// número de parte que se inspeccionó (pieza_inspeccionada → partNumber). Este
// panel agrupa los detalles del reporte por ese número de parte.

export type PartGroup = { partNumber: string; items: InspectionItemRow[] }

export type RowDetail =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; groups: PartGroup[] }

export function groupByPart(items: InspectionItemRow[]): PartGroup[] {
  const map = new Map<string, InspectionItemRow[]>()
  for (const it of items) {
    const key = it.partNumber ?? 'Sin número de parte'
    const arr = map.get(key)
    if (arr) arr.push(it)
    else map.set(key, [it])
  }
  return Array.from(map, ([partNumber, groupItems]) => ({ partNumber, items: groupItems }))
}

export function ReporteAccordionPanel({
  detail,
  detailHref,
}: {
  detail: RowDetail | undefined
  detailHref: string
}) {
  if (!detail || detail.status === 'loading') {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-slate-500">
        <Loader2 size={15} className="animate-spin" aria-hidden="true" />
        Cargando detalles…
      </div>
    )
  }

  if (detail.status === 'error') {
    return (
      <div className="flex items-center justify-between gap-3 py-1">
        <p className="text-sm text-red-500">{detail.error}</p>
        <Link href={detailHref} className="whitespace-nowrap text-xs text-blue-600 hover:underline dark:text-blue-400">
          Abrir reporte
        </Link>
      </div>
    )
  }

  if (detail.groups.length === 0) {
    return (
      <div className="flex items-center justify-between gap-3 py-1">
        <p className="text-sm text-slate-500">Este reporte aún no tiene detalles.</p>
        <Link href={detailHref} className="whitespace-nowrap text-xs text-blue-600 hover:underline dark:text-blue-400">
          Abrir reporte
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Detalles por número de parte
        </h3>
        <Link
          href={detailHref}
          className="flex items-center gap-1 whitespace-nowrap text-xs text-blue-600 hover:underline dark:text-blue-400"
        >
          Ver reporte completo
          <ChevronRight size={12} aria-hidden="true" />
        </Link>
      </div>

      {detail.groups.map((g) => {
        const totalPiezas = g.items.reduce((acc, it) => acc + it.inspected, 0)
        const totalNg = g.items.reduce((acc, it) => acc + it.ng, 0)
        return (
          <div
            key={g.partNumber}
            className="overflow-hidden rounded-lg border border-slate-200 dark:border-[#1a2d4d]"
          >
            {/* Encabezado del grupo: número de parte + resumen */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-200 bg-white px-3 py-2 dark:border-[#1a2d4d] dark:bg-[#0c1829]">
              <span className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">
                {g.partNumber}
              </span>
              <span className="text-xs text-slate-500">
                {g.items.length} detalle{g.items.length !== 1 ? 's' : ''}
              </span>
              <span className="ml-auto text-xs text-slate-500 tabular-nums">
                {totalPiezas.toLocaleString('es-MX')} pzs · {totalPiezas > 0 ? ((totalNg / totalPiezas) * 100).toFixed(1) : '0.0'}% NG
              </span>
            </div>

            {/* Detalles inspeccionados de ese número de parte */}
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 dark:text-slate-400">
                    <th className="px-3 py-2 text-left font-semibold">Lote</th>
                    <th className="px-3 py-2 text-left font-semibold">Serie</th>
                    <th className="px-3 py-2 text-left font-semibold">Identificadores</th>
                    <th className="px-3 py-2 text-right font-semibold">Total</th>
                    <th className="px-3 py-2 text-right font-semibold">OK</th>
                    <th className="px-3 py-2 text-right font-semibold">NG</th>
                    <th className="px-3 py-2 text-right font-semibold">Scrap</th>
                    <th className="px-3 py-2 text-right font-semibold">Recup.</th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((it) => (
                    <tr key={it.id} className="border-t border-slate-100 dark:border-[#1a2d4d]/60">
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{it.lote ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{it.serie ?? '—'}</td>
                      <td
                        className="max-w-[220px] truncate px-3 py-2 text-slate-600 dark:text-slate-400"
                        title={it.identificadores ?? '—'}
                      >
                        {it.identificadores ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">{it.inspected.toLocaleString('es-MX')}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-green-600 dark:text-green-400">{it.ok.toLocaleString('es-MX')}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-red-600 dark:text-red-400">{it.ng.toLocaleString('es-MX')}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-400">{it.scrap.toLocaleString('es-MX')}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-400">{it.recovered.toLocaleString('es-MX')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
