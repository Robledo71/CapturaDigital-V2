'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Download } from 'lucide-react'
import {
  readDownloadHistory,
  upsertDownloadRecord,
  type DownloadRecord,
} from '@/front/lib/downloadHistory'

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i} className="border-b border-blue-200 dark:border-[#1a2d4d]/60">
          {Array.from({ length: 9 }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 rounded-md bg-slate-200 dark:bg-[#1a2d4d] animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function MisDescargasClient() {
  const [records, setRecords] = useState<DownloadRecord[] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setRecords(readDownloadHistory())
  }, [])

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  function handleRedownload(record: DownloadRecord) {
    const url = `/api/capturacion/reportes/${encodeURIComponent(record.id)}/excel`
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-${record.id}.xlsx`
    a.click()
    upsertDownloadRecord(record)
    setRecords(readDownloadHistory())
  }

  const q = searchQuery.toLowerCase().trim()
  const filteredRecords = records
    ? q
      ? records.filter(
          (r) =>
            r.id.toLowerCase().includes(q) ||
            r.cliente.toLowerCase().includes(q) ||
            r.parte.toLowerCase().includes(q) ||
            r.cotizacion.toLowerCase().includes(q),
        )
      : records
    : []

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const pagedRecords = filteredRecords.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mis descargas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {records === null ? (
              <span className="inline-block w-32 h-4 rounded bg-slate-200 dark:bg-[#1a2d4d] animate-pulse align-middle" />
            ) : (
              `${records.length} ${records.length === 1 ? 'reporte descargado' : 'reportes descargados'}`
            )}
          </p>
        </div>

        {/* Search — only shown once hydrated */}
        {records !== null && records.length > 0 && (
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por ID, cliente, # parte, cotización..."
              aria-label="Buscar en mis descargas"
              className="pl-9 pr-4 py-2 rounded-lg border border-blue-200 dark:border-[#1a2d4d] bg-white dark:bg-[#0f2038] text-sm text-slate-900 dark:text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500 w-72"
            />
          </div>
        )}
      </div>

      {/* Empty state — not yet hydrated */}
      {records === null && (
        <div className="rounded-xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-[#1a2d4d] dark:shadow-none bg-white dark:bg-[#0f2038] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-blue-200 dark:border-[#1a2d4d]">
                {['ID', 'Cliente · Planta', 'Cotización', '# Parte', 'Piezas', '% NG', 'Publicado', 'Descargado el', ''].map(
                  (col) => (
                    <th
                      key={col}
                      className="text-xs text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3"
                    >
                      {col}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              <SkeletonRows />
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state — hydrated but no records */}
      {records !== null && records.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <Download size={36} className="text-slate-400" strokeWidth={1.5} />
          <p className="text-slate-500 text-sm">Aún no has descargado ningún reporte.</p>
          <Link href="/capturacion" className="text-sm text-blue-500 hover:underline">
            Ir a reportes publicados
          </Link>
        </div>
      )}

      {/* Table — hydrated and has records */}
      {records !== null && records.length > 0 && (
        <>
          <div className="rounded-xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-[#1a2d4d] dark:shadow-none bg-white dark:bg-[#0f2038] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-blue-200 dark:border-[#1a2d4d]">
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
                    Descargado el
                  </th>
                  <th className="w-10 px-4 py-3" aria-label="Acción" />
                </tr>
              </thead>
              <tbody>
                {pagedRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-blue-200 dark:border-[#1a2d4d]/60 hover:bg-blue-50 dark:hover:bg-[#1a2d4d]/40 transition-colors"
                  >
                    {/* ID */}
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {record.id}
                      </span>
                    </td>

                    {/* Cliente · Planta */}
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900 dark:text-white leading-tight">
                        {record.cliente}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                        {record.planta}
                      </p>
                    </td>

                    {/* Cotización */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {record.cotizacion}
                      </span>
                    </td>

                    {/* # Parte */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-900 dark:text-white">{record.parte}</span>
                    </td>

                    {/* Piezas */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-slate-900 dark:text-white">
                        {record.piezas.toLocaleString('es-MX')}
                      </span>
                    </td>

                    {/* % NG */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-slate-500 dark:text-slate-300">
                        {(record.pctNG * 100).toFixed(2)}%
                      </span>
                    </td>

                    {/* Publicado */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(record.publicadoAt)}
                      </span>
                    </td>

                    {/* Descargado el */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(record.downloadedAt)}
                      </span>
                    </td>

                    {/* Acción — re-download */}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleRedownload(record)}
                        aria-label={`Volver a descargar reporte ${record.id}`}
                        className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-[#1a2d4d] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <Download size={14} />
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredRecords.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
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
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Mostrando{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredRecords.length)}
                </span>{' '}
                de{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {filteredRecords.length}
                </span>{' '}
                reportes
              </p>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="px-3 py-1.5 rounded-lg text-sm border border-blue-200 dark:border-[#1a2d4d] text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Página anterior"
                >
                  ‹
                </button>

                {getPageNumbers(safePage, totalPages).map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-sm text-slate-400">
                      …
                    </span>
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
                  ),
                )}

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
        </>
      )}
    </div>
  )
}
