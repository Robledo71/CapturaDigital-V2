'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, Download } from 'lucide-react'
import { StatCard } from '@/front/components/supervisor/StatCard'
import type { PublishedReporteRow, PublishedReportesStats } from '@/back/services/publishedReportesService'
import { upsertDownloadRecord, getDownloadedIds } from '@/front/lib/downloadHistory'

type TabKey = 'todos' | 'sin-descargar' | 'descargados'

const PAGE_SIZE = 20

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '...')[] = [1]

  if (current > 3) pages.push('...')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push('...')

  pages.push(total)
  return pages
}

interface ReportesPublicadosClientProps {
  stats: PublishedReportesStats
  rows: PublishedReporteRow[]
  /** Título de la página. Por defecto, el de capturación. */
  title?: string
  subtitle?: string
  /** Si se provee, las filas son clickeables y disparan esta acción (p.ej. abrir modal). */
  onRowClick?: (row: PublishedReporteRow) => void
  /** Muestra controles de descarga (botón bulk, checkboxes, acción por fila). */
  canDescargar: boolean
}

function StatusBadge({ status }: { status: 'Pendiente' | 'Descargado' }) {
  if (status === 'Pendiente') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-300 dark:bg-yellow-500/15 dark:text-yellow-400 dark:border-yellow-500/30">
        Pendiente
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-300 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/30">
      Descargado
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function ReportesPublicadosClient({
  stats,
  rows,
  title = 'Captura · Reportes publicados',
  subtitle,
  onRowClick,
  canDescargar,
}: ReportesPublicadosClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('todos')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)

  const headerCheckboxRef = useRef<HTMLInputElement>(null)

  // Reset to page 1 when tab or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery])

  // Restore downloaded IDs from localStorage on mount
  useEffect(() => {
    setDownloadedIds(getDownloadedIds())
  }, [])

  function markDownloaded(row: PublishedReporteRow) {
    upsertDownloadRecord(row)
    setDownloadedIds((prev) => new Set([...prev, row.id]))
  }

  function handleDownload(row: PublishedReporteRow) {
    const url = `/api/capturacion/reportes/${encodeURIComponent(row.id)}/excel`
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-${row.id}.xlsx`
    a.click()
    markDownloaded(row)
  }

  function handleBulkDownload() {
    for (const id of selectedIds) {
      const row = rows.find((r) => r.id === id)
      if (row) handleDownload(row)
    }
  }

  const sinDescargar = rows.filter((r) => !downloadedIds.has(r.id)).length
  const descargados = downloadedIds.size

  const tabFiltered = rows.filter((r) => {
    if (activeTab === 'sin-descargar') return !downloadedIds.has(r.id)
    if (activeTab === 'descargados') return downloadedIds.has(r.id)
    return true
  })

  const q = searchQuery.toLowerCase().trim()
  const visibleRows = q
    ? tabFiltered.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.parte.toLowerCase().includes(q) ||
          r.cotizacion.toLowerCase().includes(q),
      )
    : tabFiltered

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const pagedRows = visibleRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Sync indeterminate state on header checkbox
  useEffect(() => {
    const allSelected =
      pagedRows.length > 0 && pagedRows.every((r) => selectedIds.has(r.id))
    const someSelected = pagedRows.some((r) => selectedIds.has(r.id))
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.checked = allSelected
      headerCheckboxRef.current.indeterminate = someSelected && !allSelected
    }
  }, [selectedIds, pagedRows])

  function handleHeaderCheckboxChange() {
    const allSelected =
      pagedRows.length > 0 && pagedRows.every((r) => selectedIds.has(r.id))
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        pagedRows.forEach((r) => next.delete(r.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        pagedRows.forEach((r) => next.add(r.id))
        return next
      })
    }
  }

  function handleRowCheckboxChange(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'todos', label: 'Todos', count: rows.length },
    { key: 'sin-descargar', label: 'Sin descargar', count: sinDescargar },
    { key: 'descargados', label: 'Ya descargados', count: descargados },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      {/* Page header row */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {subtitle ?? `${sinDescargar} pendientes de descarga · Conectado a control interno`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search input */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por # parte, cotización..."
              aria-label="Buscar reportes"
              className="pl-9 pr-4 py-2 rounded-lg border border-blue-200 dark:border-[#1a2d4d] bg-white dark:bg-[#0f2038] text-sm text-slate-900 dark:text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
          {/* Download selection button */}
          {canDescargar && (
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={handleBulkDownload}
              aria-label={`Descargar ${selectedIds.size} reportes seleccionados`}
              className="flex items-center gap-2 border border-blue-200 dark:border-[#1a2d4d] rounded-lg px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Download size={14} />
              Descargar selección
            </button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total publicados"
          value={String(stats.total)}
          subtitle={`${stats.total} reportes disponibles`}
          dotColor="blue"
        />
        <StatCard
          label="Sin descargar"
          value={String(sinDescargar)}
          subtitle="Pendientes de descarga"
          dotColor="yellow"
        />
        <StatCard
          label="Descargados"
          value={String(descargados)}
          subtitle="En esta sesión"
          dotColor="green"
        />
        <StatCard
          label="Total piezas inspeccionadas"
          value={stats.totalPiezas.toLocaleString('es-MX')}
          subtitle=""
          dotColor="none"
          chart={true}
        />
      </div>

      {/* Tab bar */}
      <div className="border-b border-blue-200 dark:border-[#1a2d4d] flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={
              activeTab === tab.key
                ? 'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white border-b-2 border-blue-500 -mb-px transition-colors'
                : 'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-b-2 border-transparent -mb-px transition-colors'
            }
          >
            {tab.label}
            <span
              className={
                activeTab === tab.key
                  ? 'text-xs px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400'
                  : 'text-xs px-1.5 py-0.5 rounded-full bg-slate-500/20 text-slate-500'
              }
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Table card */}
      <div className="rounded-xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-[#1a2d4d] dark:shadow-none bg-white dark:bg-[#0f2038] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-blue-200 dark:border-[#1a2d4d]">
              {canDescargar && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    ref={headerCheckboxRef}
                    onChange={handleHeaderCheckboxChange}
                    aria-label="Seleccionar todos los reportes visibles"
                    className="accent-blue-500 cursor-pointer"
                  />
                </th>
              )}
              <th className="text-xs text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3">
                ID
              </th>
              <th className="text-xs text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3">
                Cliente · Planta
              </th>
              <th className="text-xs text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3">
                Cotización
              </th>
              <th className="text-xs text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3">
                # Parte
              </th>
              <th className="text-xs text-slate-500 font-semibold uppercase tracking-wider text-right px-4 py-3">
                Piezas
              </th>
              <th className="text-xs text-slate-500 font-semibold uppercase tracking-wider text-right px-4 py-3">
                % NG
              </th>
              <th className="text-xs text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3">
                Publicado
              </th>
              <th className="text-xs text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3">
                Supervisor
              </th>
              <th className="text-xs text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3">
                Estado
              </th>
              {canDescargar && <th className="w-10 px-4 py-3" aria-label="Acciones" />}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-slate-100 dark:border-[#1a2d4d]/60 hover:bg-blue-50 dark:hover:bg-[#1a2d4d]/40 transition-colors ${
                  selectedIds.has(row.id) ? 'bg-blue-500/10' : ''
                } ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {/* Checkbox */}
                {canDescargar && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => handleRowCheckboxChange(row.id)}
                      aria-label={`Seleccionar reporte ${row.id}`}
                      className="accent-blue-500 cursor-pointer"
                    />
                  </td>
                )}

                {/* ID */}
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{row.id}</span>
                </td>

                {/* Cliente · Planta */}
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-slate-900 dark:text-white leading-tight">{row.cliente}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{row.planta}</p>
                </td>

                {/* Cotización */}
                <td className="px-4 py-3">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{row.cotizacion}</span>
                </td>

                {/* # Parte */}
                <td className="px-4 py-3">
                  <span className="text-sm text-slate-900 dark:text-white">{row.parte}</span>
                </td>

                {/* Piezas */}
                <td className="px-4 py-3 text-right">
                  <span className="text-sm text-slate-900 dark:text-white">
                    {row.piezas.toLocaleString('es-MX')}
                  </span>
                </td>

                {/* % NG */}
                <td className="px-4 py-3 text-right">
                  <span className="text-sm text-slate-500 dark:text-slate-300">
                    {(row.pctNG * 100).toFixed(2)}%
                  </span>
                </td>

                {/* Publicado */}
                <td className="px-4 py-3">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{formatDate(row.publicadoAt)}</span>
                </td>

                {/* Supervisor */}
                <td className="px-4 py-3">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{row.supervisor}</span>
                </td>

                {/* Estado */}
                <td className="px-4 py-3">
                  <StatusBadge status={downloadedIds.has(row.id) ? 'Descargado' : 'Pendiente'} />
                </td>

                {/* Download action */}
                {canDescargar && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleDownload(row)}
                      aria-label={`Descargar reporte ${row.id}`}
                      className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-[#1a2d4d] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <Download size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}

            {visibleRows.length === 0 && (
              <tr>
                <td
                  colSpan={canDescargar ? 11 : 9}
                  className="text-center text-slate-500 text-sm py-10"
                >
                  Sin resultados para esa búsqueda
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          {/* Info */}
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Mostrando{' '}
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, visibleRows.length)}
            </span>{' '}
            de{' '}
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {visibleRows.length}
            </span>{' '}
            reportes
          </p>

          {/* Controles */}
          <div className="flex items-center gap-1">
            {/* Botón anterior */}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-3 py-1.5 rounded-lg text-sm border border-blue-200 dark:border-[#1a2d4d] text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Página anterior"
            >
              ‹
            </button>

            {/* Números de página — mostrar máx 5, con elipsis */}
            {getPageNumbers(safePage, totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-sm text-slate-400">…</span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p as number)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    p === safePage
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium'
                      : 'border-blue-200 dark:border-[#1a2d4d] text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-[#1a2d4d]'
                  }`}
                  aria-label={`Ir a página ${p}`}
                  aria-current={p === safePage ? 'page' : undefined}
                >
                  {p}
                </button>
              )
            )}

            {/* Botón siguiente */}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="px-3 py-1.5 rounded-lg text-sm border border-blue-200 dark:border-[#1a2d4d] text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Página siguiente"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
