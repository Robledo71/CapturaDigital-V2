'use client'

import React, { useMemo, useState } from 'react'
import { AlertTriangle, Clock, TabletSmartphone } from 'lucide-react'
import type { InspectionItemRow, ReporteDetalleData } from '@/back/services/reporteDetalleService'
import { LegacyCsvTable } from '@/front/components/supervisor/LegacyCsvTable'

// Vista READ-ONLY del detalle de un reporte. Pensada para montarse dentro de un modal
// (servicio al cliente). No incluye acciones de workflow (muestreo/firmar/publicar/editar);
// esas viven en la página de supervisor (ReporteDetallePage).

const STATUS_CONFIG: Record<string, { dot: string; label: string; pill: string; text: string }> = {
  submitted: { dot: 'bg-blue-600 dark:bg-blue-400',   label: 'Enviado',     pill: 'bg-blue-100 border border-blue-300 dark:bg-blue-500/10 dark:border-blue-500/20',     text: 'text-blue-700 dark:text-blue-400' },
  sampling:  { dot: 'bg-violet-600 dark:bg-violet-400', label: 'En muestreo', pill: 'bg-violet-100 border border-violet-300 dark:bg-violet-500/10 dark:border-violet-500/20', text: 'text-violet-700 dark:text-violet-400' },
  signed:    { dot: 'bg-slate-500 dark:bg-slate-400',  label: 'Firmado',     pill: 'bg-slate-100 border border-slate-300 dark:bg-slate-500/10 dark:border-slate-500/20',   text: 'text-slate-600 dark:text-slate-400' },
  published: { dot: 'bg-green-600 dark:bg-green-400',  label: 'Publicado',   pill: 'bg-green-100 border border-green-300 dark:bg-green-500/10 dark:border-green-500/20',   text: 'text-green-700 dark:text-green-400' },
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return (
    d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
  )
}

// Next serializa Date → string ISO al cruzar Server→Client; rehidrata antes de usar.
function toDate(v: Date | string | null): Date | null {
  if (v === null || v === undefined) return null
  if (v instanceof Date) return v
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

function getNgColorClass(pct: number): string {
  if (pct < 1) return 'text-green-500'
  if (pct <= 3) return 'text-yellow-400'
  return 'text-red-500'
}

export function ReporteEstadoBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.submitted
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.pill} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  )
}

function MiniStatCard({ label, value, valueClass = 'text-slate-900 dark:text-white', warning = false }: {
  label: string; value: number; valueClass?: string; warning?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-[#1a2d4d] dark:bg-[#070e1a]">
      <span className="flex items-center gap-1 text-xs text-slate-500">
        {label}
        {warning && <AlertTriangle size={12} className="flex-shrink-0 text-orange-400" aria-hidden="true" />}
      </span>
      <span className={`text-xl font-bold tabular-nums ${valueClass}`}>{value.toLocaleString('es-MX')}</span>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-2">
      <dt className="flex-shrink-0 text-xs text-slate-500">{label}</dt>
      <dd className="max-w-[60%] truncate text-right text-sm font-medium text-slate-900 dark:text-white" title={value}>{value}</dd>
    </div>
  )
}

function ItemsTable({ items, totals }: {
  items: InspectionItemRow[]
  totals: { inspected: number; ok: number; ng: number; scrap: number; recovered: number }
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  if (items.length === 0) {
    return <p className="text-sm text-slate-500">Sin ítems de inspección registrados.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-blue-200 dark:border-[#1a2d4d]">
            {(['#', 'N° Parte', 'Nombre', 'Lote', 'Serie', 'Insp.', 'OK', 'NG', 'Scrap', 'Recup.', 'Inc.'] as const).map((col, i) => (
              <th key={col} className={`pb-2.5 text-xs font-medium text-slate-600 dark:text-slate-500 ${i < 3 ? 'text-left pr-4' : 'text-right pl-4'}`}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <React.Fragment key={item.id}>
              <tr className="border-b border-blue-100 dark:border-[#1a2d4d]/50">
                <td className="py-2.5 pr-4 text-xs tabular-nums text-slate-400">{idx + 1}</td>
                <td className="py-2.5 pr-4 font-mono text-xs text-slate-500" title={item.partNumber ?? '—'}>{item.partNumber ?? '—'}</td>
                <td className="max-w-[160px] truncate py-2.5 pr-4 text-slate-900 dark:text-white" title={item.partName ?? '—'}>{item.partName ?? '—'}</td>
                <td className="py-2.5 pl-4 text-right text-xs text-slate-400">{item.lote ?? '—'}</td>
                <td className="py-2.5 pl-4 text-right text-xs text-slate-400">{item.serie ?? '—'}</td>
                <td className="py-2.5 pl-4 text-right tabular-nums text-slate-900 dark:text-white">{item.inspected.toLocaleString('es-MX')}</td>
                <td className={`py-2.5 pl-4 text-right tabular-nums font-medium ${item.ok > 0 ? 'text-green-500' : 'text-slate-400'}`}>{item.ok.toLocaleString('es-MX')}</td>
                <td className={`py-2.5 pl-4 text-right tabular-nums ${item.ng > 0 ? 'font-bold text-orange-400' : 'text-slate-400'}`}>{item.ng.toLocaleString('es-MX')}</td>
                <td className={`py-2.5 pl-4 text-right tabular-nums ${item.scrap === 0 ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>{item.scrap.toLocaleString('es-MX')}</td>
                <td className="py-2.5 pl-4 text-right tabular-nums text-slate-900 dark:text-white">{item.recovered.toLocaleString('es-MX')}</td>
                <td className="py-2.5 pl-4 text-right">
                  {item.incidents.length === 0 ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      className="inline-flex min-w-[24px] items-center justify-center rounded-full bg-orange-400/10 px-2 py-0.5 text-xs font-medium text-orange-400 transition-colors hover:bg-orange-400/20"
                    >
                      {item.incidents.length}
                    </button>
                  )}
                </td>
              </tr>
              {expandedId === item.id && (
                <tr className="bg-slate-50 dark:bg-[#070e1a]">
                  <td colSpan={11} className="px-6 py-3">
                    <ul className="flex flex-col gap-1.5">
                      {item.incidents.map((inc, i) => (
                        <li key={i} className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                          <span>{inc.description}</span>
                          <span className="font-medium tabular-nums">{inc.count}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-blue-200 dark:border-[#1a2d4d]">
            <td colSpan={5} className="py-2.5 text-xs font-semibold text-slate-500">Totales</td>
            <td className="py-2.5 pl-4 text-right tabular-nums font-semibold text-slate-900 dark:text-white">{totals.inspected.toLocaleString('es-MX')}</td>
            <td className="py-2.5 pl-4 text-right tabular-nums font-semibold text-green-500">{totals.ok.toLocaleString('es-MX')}</td>
            <td className="py-2.5 pl-4 text-right tabular-nums font-bold text-orange-400">{totals.ng.toLocaleString('es-MX')}</td>
            <td className="py-2.5 pl-4 text-right tabular-nums font-semibold text-slate-900 dark:text-white">{totals.scrap.toLocaleString('es-MX')}</td>
            <td className="py-2.5 pl-4 text-right tabular-nums font-semibold text-slate-900 dark:text-white">{totals.recovered.toLocaleString('es-MX')}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function TimelineStep({ label, actor, date, done, dotClass }: {
  label: string; actor: string; date: Date | null; done: boolean; dotClass: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${done ? dotClass : 'bg-slate-600'}`} aria-hidden="true" />
      <div className="flex min-w-0 flex-col pb-3">
        <span className={`text-sm font-medium ${done ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{label}</span>
        {done ? (
          <>
            <span className="truncate text-xs text-slate-500">{actor}</span>
            <span className="text-xs text-slate-500">{formatDate(date)}</span>
          </>
        ) : (
          <span className="text-xs italic text-slate-500">pendiente</span>
        )}
      </div>
    </div>
  )
}

export function ReporteDetalleResumen({ reporte }: { reporte: ReporteDetalleData }) {
  const {
    status, cliente, planta, cotizacion, parte, totalInspected, totalOk, totalNg,
    totalScrap, totalRecovered, totalIncidents, pzsPorIncidencia, inspectionItems,
    operadores, turno, tabletAlias, supervisorName, isLegacy, legacyCsvTable,
  } = reporte

  const createdAt = toDate(reporte.createdAt)
  const sessionCreatedAt = toDate(reporte.sessionCreatedAt)
  const sessionFinishedAt = toDate(reporte.sessionFinishedAt)
  const sampledAt = toDate(reporte.sampledAt)
  const signedAt = toDate(reporte.signedAt)
  const publishedAt = toDate(reporte.publishedAt)

  const totals = useMemo(() => {
    if (isLegacy) {
      return { ok: totalOk, ng: totalNg, scrap: totalScrap, recovered: totalRecovered, inspected: totalInspected, incidents: totalIncidents, pzsPorIncidencia }
    }
    const ok = inspectionItems.reduce((s, i) => s + i.ok, 0)
    const ng = inspectionItems.reduce((s, i) => s + i.ng, 0)
    const scrap = inspectionItems.reduce((s, i) => s + i.scrap, 0)
    const recovered = inspectionItems.reduce((s, i) => s + i.recovered, 0)
    const inspected = inspectionItems.reduce((s, i) => s + i.inspected, 0)
    const incidents = inspectionItems.reduce((s, i) => s + i.incidents.length, 0)
    return { ok, ng, scrap, recovered, inspected, incidents, pzsPorIncidencia: incidents > 0 ? Math.round(ng / incidents) : 0 }
  }, [isLegacy, inspectionItems, totalOk, totalNg, totalScrap, totalRecovered, totalInspected, totalIncidents, pzsPorIncidencia])

  const ngPct = totals.inspected > 0 ? (totals.ng / totals.inspected) * 100 : 0
  const ngPctDisplay = totals.inspected > 0 ? `${ngPct.toFixed(2)}%` : '—'
  const ngPctClass = totals.inspected > 0 ? getNgColorClass(ngPct) : 'text-slate-500'

  const isAssigned = sessionCreatedAt !== null
  const isCaptured = sessionFinishedAt !== null
  const isSampling = ['sampling', 'signed', 'published'].includes(status)
  const isSigned = ['signed', 'published'].includes(status)
  const isPublished = status === 'published'

  const cardCls = 'rounded-xl border border-slate-100 bg-white p-4 dark:border-[#1a2d4d] dark:bg-[#0c1829]'

  return (
    <div className="flex flex-col gap-5">
      {isLegacy && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-300">
          Reporte histórico del sistema anterior. Datos en modo solo-lectura.
        </div>
      )}

      {/* Datos del servicio + Historial */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className={cardCls}>
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Datos del servicio</h3>
          <dl className="flex flex-col gap-2.5">
            <InfoRow label="Cliente" value={cliente} />
            <InfoRow label="Planta" value={planta} />
            <InfoRow label="Cotización" value={cotizacion} />
            <InfoRow label="# Parte" value={parte} />
            <InfoRow label="Turno" value={turno} />
            <InfoRow label="Operadores" value={operadores} />
          </dl>
          {tabletAlias && (
            <div className="mt-3 flex items-center gap-1.5 border-t border-blue-200 pt-3 dark:border-[#1a2d4d]">
              <TabletSmartphone size={14} className="flex-shrink-0 text-slate-500" aria-hidden="true" />
              <span className="text-xs text-slate-500">{tabletAlias}</span>
            </div>
          )}
        </div>

        <div className={cardCls}>
          <div className="mb-3 flex items-center gap-1.5">
            <Clock size={14} className="flex-shrink-0 text-slate-500" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Historial</h3>
          </div>
          <div className="flex flex-col" role="list">
            <TimelineStep label="Creado por supervisor" actor={supervisorName} date={createdAt} done dotClass="bg-green-400" />
            <TimelineStep label="Asignado a operador" actor={operadores} date={sessionCreatedAt} done={isAssigned} dotClass="bg-green-400" />
            <TimelineStep label="Capturado por operador" actor={operadores} date={sessionFinishedAt} done={isCaptured} dotClass="bg-green-400" />
            <TimelineStep label="Muestreo aprobado" actor={supervisorName} date={sampledAt} done={isSampling} dotClass="bg-blue-400" />
            <TimelineStep label="Firmado" actor={supervisorName} date={signedAt} done={isSigned} dotClass="bg-slate-400" />
            <TimelineStep label="Publicado" actor={supervisorName} date={publishedAt} done={isPublished} dotClass="bg-green-400" />
          </div>
        </div>
      </div>

      {/* Resumen de piezas */}
      <div className={cardCls}>
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Resumen de piezas inspeccionadas</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MiniStatCard label="Piezas OK" value={totals.ok} valueClass="text-green-500" />
          <MiniStatCard label="Piezas NG" value={totals.ng} valueClass="text-orange-400" warning={totals.ng > 0} />
          <MiniStatCard label="Scrap" value={totals.scrap} />
          <MiniStatCard label="Recuperadas" value={totals.recovered} />
          <MiniStatCard label="Incidencias" value={totals.incidents} />
          <MiniStatCard label="Pzs / incidencia" value={totals.pzsPorIncidencia} />
        </div>
        <div className="mt-3 flex flex-col gap-2 border-t border-blue-200 pt-3 dark:border-[#1a2d4d]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Total inspeccionadas</span>
            <span className="font-medium tabular-nums text-slate-900 dark:text-white">{totals.inspected.toLocaleString('es-MX')} pzs</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">% NG</span>
            <span className={`font-medium tabular-nums ${ngPctClass}`}>{ngPctDisplay}</span>
          </div>
        </div>
      </div>

      {/* Detalle por ítem */}
      <div className={cardCls}>
        <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Detalle por ítem inspeccionado</h3>
        {isLegacy
          ? <LegacyCsvTable items={Array.isArray(legacyCsvTable) ? legacyCsvTable : []} />
          : <ItemsTable items={inspectionItems} totals={totals} />}
      </div>
    </div>
  )
}
