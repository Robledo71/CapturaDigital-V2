'use client'

import { useState } from 'react'
import { Search, UserCheck, UserPlus } from 'lucide-react'
import type { InformalOrderRow } from '@/shared/types/informalOrder'
import { InformalOrderDetailModal } from './InformalOrderDetailModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface InformalOrdersTableProps {
  orders: InformalOrderRow[]
  /** Cuando se provee, se muestra el botón "Asignar" en filas sin inspectores (además del "Ver detalles", siempre visible). */
  onAssign?: (order: InformalOrderRow) => void
}

// ─── Sub-components ────────────────────────────────────────────────────────────

export function TipoOrdenBadge({ tipo }: { tipo: 'OV' | 'OA' }) {
  if (tipo === 'OV') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-400">
        OV
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 dark:bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-700 dark:text-violet-400">
      OA
    </span>
  )
}

export function EstadoReporteBadge({ estado }: { estado: 'ENVIADO' | 'FIRMADO' | null }) {
  if (estado === 'FIRMADO') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-300">
        <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400" aria-hidden="true" />
        Firmado
      </span>
    )
  }
  if (estado === 'ENVIADO') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
        Enviado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-500/10 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" aria-hidden="true" />
      Sin reporte
    </span>
  )
}

export function InspectoresCell({ inspectores }: { inspectores: { id: number; name: string }[] }) {
  if (inspectores.length === 0) {
    return <span className="text-xs text-slate-600 dark:text-slate-500">Sin asignar</span>
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {inspectores.map((inspector) => (
        <span
          key={inspector.id}
          className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300"
        >
          <UserCheck size={11} className="flex-shrink-0" aria-hidden="true" />
          {inspector.name}
        </span>
      ))}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function InformalOrdersTable({ orders, onAssign }: InformalOrdersTableProps) {
  const [search, setSearch] = useState('')
  const [detailOrder, setDetailOrder] = useState<InformalOrderRow | null>(null)

  const filtered = orders.filter((o) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      (o.clienteNombre ?? '').toLowerCase().includes(q) ||
      (o.plantaNombre ?? '').toLowerCase().includes(q) ||
      o.numeroParte.toLowerCase().includes(q) ||
      (o.nombreParte ?? '').toLowerCase().includes(q) ||
      (o.solicitanteNombre ?? '').toLowerCase().includes(q) ||
      o.inspectores.some((i) => i.name.toLowerCase().includes(q))
    )
  })

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative shrink-0 max-w-sm">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Buscar por cliente, planta, parte o solicitante..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar órdenes informales"
          className="pl-9 pr-4 py-2 text-sm rounded-lg bg-white dark:bg-[#0c1829] border border-blue-200 dark:border-[#1a2d4d] text-slate-800 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 w-full transition-colors"
        />
      </div>

      {/* Table */}
      <div className="shrink-0 rounded-xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-[#0c1829] dark:shadow-none bg-white dark:bg-[#0c1829] overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm" aria-label="Tabla de órdenes informales">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#1a2d4d]">
                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                  Tipo
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                  Cliente
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                  Planta
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                  N° de parte
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                  Solicitante
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                  Inspectores
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                  Estado reporte
                </th>
                {/* "Ver detalles" siempre visible; "Asignar" solo cuando el portal provee onAssign. */}
                <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1a2d4d]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500 text-sm">
                    No se encontraron órdenes informales con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filtered.map((order) => (
                  <tr
                    key={order.itemOrdenInformalId}
                    onClick={() => setDetailOrder(order)}
                    tabIndex={0}
                    role="button"
                    aria-label={`Ver detalles de ${order.numeroParte}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setDetailOrder(order)
                      }
                    }}
                    className="cursor-pointer hover:bg-blue-50 dark:hover:bg-[#1a2d4d]/40 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <TipoOrdenBadge tipo={order.tipoOrden} />
                    </td>
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-200 font-medium whitespace-nowrap">
                      {order.clienteNombre ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {order.plantaNombre ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-slate-800 dark:text-slate-200">{order.numeroParte}</span>
                        {order.nombreParte && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">{order.nombreParte}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {order.solicitanteNombre ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <InspectoresCell inspectores={order.inspectores} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <EstadoReporteBadge estado={order.estadoReporte} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {onAssign && order.inspectores.length === 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onAssign(order)
                            }}
                            aria-label={`Asignar inspectores a ${order.numeroParte}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 transition-colors hover:border-blue-400 hover:bg-blue-500/20"
                          >
                            <UserPlus size={12} className="flex-shrink-0" aria-hidden="true" />
                            Asignar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detailOrder !== null && (
        <InformalOrderDetailModal orden={detailOrder} onClose={() => setDetailOrder(null)} />
      )}
    </div>
  )
}
