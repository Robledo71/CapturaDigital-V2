'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import type { InformalReporteListRow } from '@/back/services/informalReportesService'
import { getAvatarColor } from '@/front/lib/avatarColor'

// ─── Avatar helpers ────────────────────────────────────────────────────────────

function getInitialsFromName(nombre: string): string {
  if (!nombre) return '?'
  const first = nombre.split(',')[0].trim()
  return first.split(' ').filter(Boolean).slice(0, 2).map((w) => w.charAt(0)).join('').toUpperCase() || '?'
}

// ─── Badges ────────────────────────────────────────────────────────────────────

function TipoOrdenBadge({ tipo }: { tipo: 'OV' | 'OA' }) {
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

type EstatusKey = 'submitted' | 'signed'

const ESTATUS_CONFIG: Record<EstatusKey, { dot: string; text: string; pill: string; label: string }> = {
  submitted: {
    dot: 'bg-blue-600 dark:bg-blue-400',
    text: 'text-blue-700 dark:text-blue-300',
    pill: 'bg-blue-100 border border-blue-300 dark:bg-blue-500/10 dark:border-blue-500/20',
    label: 'Enviado',
  },
  signed: {
    dot: 'bg-slate-500 dark:bg-slate-400',
    text: 'text-slate-600 dark:text-slate-300',
    pill: 'bg-slate-100 border border-slate-300 dark:bg-slate-500/10 dark:border-slate-500/20',
    label: 'Firmado',
  },
}

function EstatusBadge({ estatus }: { estatus: EstatusKey }) {
  const cfg = ESTATUS_CONFIG[estatus]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.pill} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  )
}

function InspectorAvatar({ nombre }: { nombre: string }) {
  const iniciales = getInitialsFromName(nombre)
  const avatarColor = getAvatarColor(nombre)
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${avatarColor}`}
        aria-hidden="true"
      >
        <span className="text-white dark:text-white text-xs font-bold">{iniciales}</span>
      </div>
      <span className="text-slate-700 dark:text-slate-300 text-sm">{nombre}</span>
    </div>
  )
}

// ─── Tabs ──────────────────────────────────────────────────────────────────────

type TabKey = 'todos' | EstatusKey

interface TabConfig {
  key: TabKey
  label: string
  count: number
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface ReportesInformalesPageProps {
  reportes: InformalReporteListRow[]
  /** Base del enlace al detalle de cada reporte. Por defecto el del supervisor. */
  detailHrefBase?: string
}

const PAGE_SIZE = 10

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ReportesInformalesPage({
  reportes,
  detailHrefBase = '/supervisor/reportes-informales',
}: ReportesInformalesPageProps) {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<TabKey>('todos')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const statusCounts = {
    submitted: reportes.filter((r) => r.status === 'submitted').length,
    signed: reportes.filter((r) => r.status === 'signed').length,
  }

  const TABS: TabConfig[] = [
    { key: 'todos', label: 'Todos', count: reportes.length },
    { key: 'submitted', label: 'Enviados', count: statusCounts.submitted },
    { key: 'signed', label: 'Firmados', count: statusCounts.signed },
  ]

  const filtered = reportes.filter((r) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      (r.clienteNombre ?? '').toLowerCase().includes(q) ||
      (r.plantaNombre ?? '').toLowerCase().includes(q) ||
      r.numeroParte.toLowerCase().includes(q) ||
      (r.nombreParte ?? '').toLowerCase().includes(q) ||
      (r.inspector ?? '').toLowerCase().includes(q)
    const matchTab = activeTab === 'todos' || r.status === activeTab
    return matchTab && matchSearch
  })

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    setPage(1)
  }, [search, activeTab])

  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 flex flex-col gap-5">

        {/* Page header */}
        <div className="shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Reportes informales</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="relative flex-1 sm:flex-none">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar reportes informales"
              className="pl-9 pr-4 py-2 text-sm rounded-lg bg-white dark:bg-[#0c1829] border border-blue-200 dark:border-[#1a2d4d] text-slate-800 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700/40 w-full sm:w-52 transition-colors"
            />
          </div>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Filtrar por estatus"
          className="shrink-0 flex items-end gap-0 border-b border-blue-200 dark:border-[#1a2d4d] overflow-x-auto scrollbar-thin"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap ${isActive
                    ? 'text-slate-900 dark:text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-700'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                {tab.label}
                <span
                  className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-medium ${isActive
                      ? 'bg-slate-100 dark:bg-blue-500/20 text-slate-700 dark:text-blue-300'
                      : 'bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400'
                    }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Table */}
        <div className="shrink-0 rounded-xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-[#0c1829] dark:shadow-none bg-white dark:bg-[#0c1829] overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm" aria-label="Tabla de reportes informales">
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
                    N° Parte
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                    Inspector
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                    Turno
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                    Fecha
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                    <span className="sr-only">Abrir</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white dark:divide-[#1a2d4d]">
                {reportes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500 text-sm">
                      No hay reportes informales registrados aún.
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500 text-sm">
                      No se encontraron reportes con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  paginated.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => router.push(`${detailHrefBase}/${r.id}`)}
                      className="hover:bg-blue-50 dark:hover:bg-[#1a2d4d]/40 transition-colors group cursor-pointer"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <TipoOrdenBadge tipo={r.tipoOrden} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-slate-800 dark:text-slate-200 font-medium text-sm">{r.clienteNombre ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-sm whitespace-nowrap">
                        {r.plantaNombre ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs text-slate-800 dark:text-slate-200">{r.numeroParte}</span>
                          {r.nombreParte && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">{r.nombreParte}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <InspectorAvatar nombre={r.inspector ?? '—'} />
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm whitespace-nowrap">
                        {r.horario ?? '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <EstatusBadge estatus={r.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm whitespace-nowrap">
                        {formatDate(r.fechaCreado)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ChevronRight
                          size={15}
                          className="text-blue-400 group-hover:text-slate-600 dark:text-slate-400 transition-colors inline"
                          aria-hidden="true"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="shrink-0 flex items-center justify-between gap-3 pt-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mostrando{' '}
              <span className="font-medium text-slate-900 dark:text-white">
                {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}
              </span>{' '}
              de{' '}
              <span className="font-medium text-slate-900 dark:text-white">{filtered.length}</span>{' '}
              registros
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Página anterior"
                className="flex items-center justify-center h-8 w-8 rounded-lg border border-blue-200 dark:border-[#1a2d4d] text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Página siguiente"
                className="flex items-center justify-center h-8 w-8 rounded-lg border border-blue-200 dark:border-[#1a2d4d] text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
