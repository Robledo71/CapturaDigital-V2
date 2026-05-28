'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { LockKeyhole, LockKeyholeOpen, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import type { CotizacionRow } from '@/back/services/cotizacionesService'
import { desbloquearCotizacionAction, type DesbloquearCotizacionState } from '@/app/actions/desbloquear-cotizacion'

const PAGE_SIZE = 10

interface Props {
  cotizaciones: CotizacionRow[]
}

function ToggleButton({
  cotizacion,
  onToggle,
}: {
  cotizacion: CotizacionRow
  onToggle: (id: number, value: boolean) => void
}) {
  const [state, formAction] = useActionState<DesbloquearCotizacionState, FormData>(
    desbloquearCotizacionAction,
    undefined,
  )
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (state?.ok) {
      setPending(false)
      onToggle(cotizacion.id, !cotizacion.desbloqueado)
    } else if (state && !state.ok) {
      setPending(false)
    }
  }, [state, cotizacion.id, cotizacion.desbloqueado, onToggle])

  return (
    <form action={(fd) => { setPending(true); formAction(fd) }}>
      <input type="hidden" name="cotizacionId" value={String(cotizacion.id)} />
      <input type="hidden" name="desbloqueado" value={String(!cotizacion.desbloqueado)} />
      <button
        type="submit"
        disabled={pending}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
          cotizacion.desbloqueado
            ? 'border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20'
            : 'border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20'
        }`}
      >
        {pending ? (
          <Loader2 size={13} className="animate-spin" />
        ) : cotizacion.desbloqueado ? (
          <LockKeyhole size={13} />
        ) : (
          <LockKeyholeOpen size={13} />
        )}
        {cotizacion.desbloqueado ? 'Bloquear' : 'Desbloquear'}
      </button>
      {state && !state.ok && (
        <p className="mt-1 text-xs text-red-400">{state.error}</p>
      )}
    </form>
  )
}

export function DesbloquearCotizacionesClient({ cotizaciones: initial }: Props) {
  const [cotizaciones, setCotizaciones] = useState(initial)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  function handleToggle(id: number, newValue: boolean) {
    setCotizaciones((prev) =>
      prev.map((c) => (c.id === id ? { ...c, desbloqueado: newValue } : c)),
    )
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return cotizaciones
    return cotizaciones.filter(
      (c) =>
        (c.consecutiveNumber ?? '').toLowerCase().includes(q) ||
        (c.orderConsecutive ?? '').toLowerCase().includes(q) ||
        (c.clientName ?? '').toLowerCase().includes(q) ||
        (c.clientEmail ?? '').toLowerCase().includes(q),
    )
  }, [cotizaciones, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Desbloquear Cotizaciones</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Gestiona el acceso del cliente a sus cotizaciones.
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por cotización, orden o cliente..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full rounded-lg border border-[#1a2d4d] bg-[#0c1829] pl-9 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
        />
      </div>

      <div className="rounded-xl border border-[#1a2d4d] bg-[#0c1829] overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            {search ? 'Sin resultados para la búsqueda.' : 'No hay cotizaciones registradas.'}
          </p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a2d4d]">
                  {['Cotización', 'Orden', 'Cliente', 'Email', 'Estado', 'Acceso', 'Acción'].map((col, i) => (
                    <th
                      key={col}
                      className={`px-4 py-3 text-xs font-medium text-slate-500 ${i < 5 ? 'text-left' : 'text-center'}`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((c) => (
                  <tr key={c.id} className="border-b border-[#1a2d4d]/60 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                      {c.consecutiveNumber ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {c.orderConsecutive ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-white max-w-[160px] truncate" title={c.clientName ?? ''}>
                      {c.clientName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 max-w-[160px] truncate" title={c.clientEmail ?? ''}>
                      {c.clientEmail ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {c.status ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.desbloqueado
                            ? 'bg-green-500/10 text-green-300'
                            : 'bg-slate-500/10 text-slate-400'
                        }`}
                      >
                        {c.desbloqueado ? (
                          <><LockKeyholeOpen size={11} /> Desbloqueada</>
                        ) : (
                          <><LockKeyhole size={11} /> Bloqueada</>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ToggleButton cotizacion={c} onToggle={handleToggle} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-[#1a2d4d] px-4 py-3">
              <p className="text-xs text-slate-500">
                {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
                {totalPages > 1 && ` · Página ${currentPage} de ${totalPages}`}
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#1a2d4d] text-slate-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…')
                      acc.push(p)
                      return acc
                    }, [])
                    .map((p, i) =>
                      p === '…' ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-xs text-slate-600">…</span>
                      ) : (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPage(p as number)}
                          className={`inline-flex h-7 min-w-[28px] items-center justify-center rounded-md border px-2 text-xs transition-colors ${
                            currentPage === p
                              ? 'border-blue-500 bg-blue-600 text-white'
                              : 'border-[#1a2d4d] text-slate-400 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          {p}
                        </button>
                      ),
                    )}
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#1a2d4d] text-slate-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
