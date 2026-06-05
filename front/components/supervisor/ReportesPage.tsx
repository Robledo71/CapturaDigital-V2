'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Plus, ChevronRight } from 'lucide-react'
import type { ReporteRow, ReporteEstatus } from '@/back/services/reportesService'

// ─── Avatar helpers ────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-violet-600',
  'bg-teal-600',
  'bg-indigo-600',
  'bg-orange-600',
  'bg-rose-600',
]

function getInitialsFromName(nombre: string): string {
  if (!nombre) return '?'
  const first = nombre.split(',')[0].trim()
  return first.split(' ').filter(Boolean).slice(0, 2).map((w) => w.charAt(0)).join('').toUpperCase() || '?'
}

function getAvatarColor(nombre: string): string {
  return AVATAR_COLORS[nombre.length % AVATAR_COLORS.length]
}

// ─── Status badge config ───────────────────────────────────────────────────────

const ESTATUS_CONFIG: Record<
  ReporteEstatus,
  { dot: string; text: string; pill: string }
> = {
  Enviado: {
    dot: 'bg-blue-600 dark:bg-blue-400',
    text: 'text-blue-700 dark:text-blue-300',
    pill: 'bg-blue-100 border border-blue-300 dark:bg-blue-500/10 dark:border-blue-500/20',
  },
  'En muestreo': {
    dot: 'bg-violet-600 dark:bg-violet-400',
    text: 'text-violet-700 dark:text-violet-300',
    pill: 'bg-violet-100 border border-violet-300 dark:bg-violet-500/10 dark:border-violet-500/20',
  },
  Firmado: {
    dot: 'bg-slate-500 dark:bg-slate-400',
    text: 'text-slate-600 dark:text-slate-300',
    pill: 'bg-slate-100 border border-slate-300 dark:bg-slate-500/10 dark:border-slate-500/20',
  },
  Publicado: {
    dot: 'bg-green-600 dark:bg-green-400',
    text: 'text-green-700 dark:text-green-300',
    pill: 'bg-green-100 border border-green-300 dark:bg-green-500/10 dark:border-green-500/20',
  },
}

// ─── Tab config ────────────────────────────────────────────────────────────────

type TabKey = 'todos' | ReporteEstatus

interface TabConfig {
  key: TabKey
  label: string
  count: number
}

// ─── Sub-components ────────────────────────────────────────────────────────────

interface EstatusBadgeProps {
  estatus: ReporteEstatus
}

function EstatusBadge({ estatus }: EstatusBadgeProps) {
  const cfg = ESTATUS_CONFIG[estatus]
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.pill} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} aria-hidden="true" />
      {estatus}
    </span>
  )
}

interface InspectorAvatarProps {
  nombre: string
}

function InspectorAvatar({ nombre }: InspectorAvatarProps) {
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

// ─── Props ─────────────────────────────────────────────────────────────────────

interface ReportesPageProps {
  initialReportes: ReporteRow[]
}

const PAGE_SIZE = 20

// ─── Main component ────────────────────────────────────────────────────────────

export function ReportesPage({ initialReportes }: ReportesPageProps) {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<TabKey>('todos')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Conteos globales sobre TODOS los reportes (no solo la página visible).
  const statusCounts = {
    Enviado: initialReportes.filter((r) => r.estatus === 'Enviado').length,
    'En muestreo': initialReportes.filter((r) => r.estatus === 'En muestreo').length,
    Firmado: initialReportes.filter((r) => r.estatus === 'Firmado').length,
    Publicado: initialReportes.filter((r) => r.estatus === 'Publicado').length,
  }

  const TABS: TabConfig[] = [
    { key: 'todos',       label: 'Todos',        count: initialReportes.length },
    { key: 'Enviado',     label: 'Por revisar',  count: statusCounts.Enviado },
    { key: 'En muestreo', label: 'En muestreo',  count: statusCounts['En muestreo'] },
    { key: 'Firmado',     label: 'Firmados',     count: statusCounts.Firmado },
    { key: 'Publicado',   label: 'Publicados',   count: statusCounts.Publicado },
  ]

  // Filtrado por búsqueda + tab sobre el set completo.
  const filtered = initialReportes.filter((r) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      r.id.toLowerCase().includes(q) ||
      r.cliente.toLowerCase().includes(q) ||
      r.cotizacion.toLowerCase().includes(q) ||
      r.parte.toLowerCase().includes(q)
    const matchTab = activeTab === 'todos' || r.estatus === activeTab
    return matchTab && matchSearch
  })

  // Paginación en cliente sobre el set filtrado.
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Si cambian filtros/búsqueda, vuelve a la página 1 para no quedar fuera de rango.
  useEffect(() => {
    setPage(1)
  }, [search, activeTab])

  // Clampa la página actual al rango válido (p. ej. tras filtrar).
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Scrollable area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 flex flex-col gap-5">

        {/* Page header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Reportes de inspección</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
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
                aria-label="Buscar reportes"
                className="pl-9 pr-4 py-2 text-sm rounded-lg bg-white dark:bg-[#0c1829] border border-blue-200 dark:border-[#1a2d4d] text-slate-800 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700/40 w-52 transition-colors"
              />
            </div>

            {/* New report */}
            <Link
              href="/supervisor/carga-trabajo"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white dark:text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              <Plus size={15} />
              Nuevo
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Filtrar por estatus"
          className="flex items-end gap-0 border-b border-blue-200 dark:border-[#1a2d4d]"
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
        <div className="rounded-xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-[#1a2d4d] dark:shadow-none bg-white dark:bg-[#0c1829]">
          <div className="overflow-x-auto overflow-y-hidden">
            <table className="w-full text-sm" aria-label="Tabla de reportes de inspección">
              <thead>
                <tr className="border-b border-blue-200 dark:border-[#1a2d4d]">
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    ID
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    Cliente · Planta
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    Cotización
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    # Parte
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    Inspector
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    Turno
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    Estatus
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    Piezas
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    %NG
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-wider">
                    <span className="sr-only">Abrir</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100 dark:divide-[#1a2d4d]">
                {initialReportes.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-500 text-sm">
                      No hay reportes de inspección registrados aún.
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-500 text-sm">
                      No se encontraron reportes con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  paginated.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => router.push(`/supervisor/reportes/${r.id}`)}
                      className="hover:bg-blue-50 dark:hover:bg-[#1a2d4d]/40 transition-colors group cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">
                        {r.id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-slate-800 dark:text-slate-200 font-medium text-sm">{r.cliente}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{r.planta}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">
                        {r.cotizacion}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">
                        {r.parte}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <InspectorAvatar nombre={r.inspector} />
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm whitespace-nowrap">
                        {r.turno}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <EstatusBadge estatus={r.estatus} />
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 text-sm tabular-nums whitespace-nowrap">
                        {r.piezas}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 text-sm tabular-nums whitespace-nowrap">
                        {r.pctNG}
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

          {total > 0 && (
            <div className="flex items-center justify-between border-t border-blue-200 dark:border-[#1a2d4d] px-4 py-3">
              <span className="text-xs text-slate-500">
                {total.toLocaleString('es-MX')} resultado{total !== 1 ? 's' : ''} · página {currentPage} de {totalPages}
              </span>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-blue-200 dark:border-[#1a2d4d] text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-[#1a2d4d]/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Anterior
                  </button>

                  <div className="flex items-center gap-1 mx-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                      const isCurrentPage = p === currentPage
                      const show = p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1
                      if (!show) {
                        const isGap = p === 2 || p === totalPages - 1
                        return isGap ? (
                          <span key={p} className="px-1 text-xs text-slate-400">…</span>
                        ) : null
                      }
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPage(p)}
                          className={`min-w-[28px] px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            isCurrentPage
                              ? 'bg-blue-600 text-white'
                              : 'border border-blue-200 dark:border-[#1a2d4d] text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-[#1a2d4d]/40'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage(currentPage + 1)}
                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-blue-200 dark:border-[#1a2d4d] text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-[#1a2d4d]/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

    </div>
  )
}
