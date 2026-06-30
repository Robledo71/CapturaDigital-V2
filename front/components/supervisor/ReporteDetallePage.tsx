'use client'

import React, { useActionState, useEffect, useMemo, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit2,
  Loader2,
  TabletSmartphone,
  X,
} from 'lucide-react'
import type { InspectionItemRow, ReporteDetalleData } from '@/back/services/reporteDetalleService'
import { LegacyCsvTable } from '@/front/components/supervisor/LegacyCsvTable'
import {
  publishReporteAction,
  registerSamplingAction,
  signReporteAction,
  type WorkflowActionState,
} from '@/app/actions/reporte-workflow'
import {
  updateInspectionItemAction,
  type UpdateInspectionItemState,
} from '@/app/actions/update-inspection-item'
import { can, type SessionLike } from '@/front/lib/permisos'
import { SAMPLING_RULES } from '@/front/lib/sampling'

interface ReporteDetallePageProps {
  reporte: ReporteDetalleData
  /** Permisos efectivos del usuario, para decidir qué acciones de workflow mostrar. */
  rol: string
  permisos?: string[] | null
  /** Destino del botón "volver". Por defecto la lista de reportes del supervisor. */
  backHref?: string
}

const STATUS_CONFIG: Record<string, { dot: string; label: string; pill: string; text: string }> = {
  submitted: {
    dot: 'bg-blue-600 dark:bg-blue-400',
    label: 'Enviado',
    pill: 'bg-blue-100 border border-blue-300 dark:bg-blue-500/10 dark:border-blue-500/20',
    text: 'text-blue-700 dark:text-blue-400',
  },
  sampling: {
    dot: 'bg-violet-600 dark:bg-violet-400',
    label: 'En muestreo',
    pill: 'bg-violet-100 border border-violet-300 dark:bg-violet-500/10 dark:border-violet-500/20',
    text: 'text-violet-700 dark:text-violet-400',
  },
  signed: {
    dot: 'bg-slate-500 dark:bg-slate-400',
    label: 'Firmado',
    pill: 'bg-slate-100 border border-slate-300 dark:bg-slate-500/10 dark:border-slate-500/20',
    text: 'text-slate-600 dark:text-slate-400',
  },
  published: {
    dot: 'bg-green-600 dark:bg-green-400',
    label: 'Publicado',
    pill: 'bg-green-100 border border-green-300 dark:bg-green-500/10 dark:border-green-500/20',
    text: 'text-green-700 dark:text-green-400',
  },
}

function getInitials(operadores: string): string {
  if (!operadores) return '?'
  const first = operadores.split(',')[0].trim()
  const words = first.split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?'
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime()
  const diffMin = Math.max(0, Math.floor(diffMs / 60_000))
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `hace ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  return `hace ${diffD} dia${diffD !== 1 ? 's' : ''}`
}

function formatDate(date: Date | null): string {
  if (!date) return '-'
  const d = new Date(date)
  return (
    d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
  )
}

function getNgColorClass(pct: number): string {
  if (pct < 1) return 'text-green-500'
  if (pct <= 3) return 'text-yellow-400'
  return 'text-red-500'
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.submitted

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.pill} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  )
}

function MiniStatCard({
  label,
  value,
  valueClass = 'text-dark dark:text-white',
  warning = false,
}: {
  label: string
  value: number
  valueClass?: string
  warning?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-blue-50 bg-slate-100 p-4 dark:border-[#070e1a] dark:bg-[#070e1a]">
      <span className="flex items-center gap-1 text-xs text-slate-500">
        {label}
        {warning && <AlertTriangle size={12} className="flex-shrink-0 text-orange-400" aria-hidden="true" />}
      </span>
      <span className={`text-2xl font-bold tabular-nums ${valueClass}`}>
        {value.toLocaleString('es-MX')}
      </span>
    </div>
  )
}

function InspectionItemsTable({
  items,
  totals,
  onEditItem,
}: {
  items: InspectionItemRow[]
  totals: { inspected: number; ok: number; ng: number; scrap: number; recovered: number }
  onEditItem?: (item: InspectionItemRow) => void
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const colCount = onEditItem ? 13 : 12

  return (
    <div className="rounded-xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white p-5 dark:border-[#0c1829] dark:shadow-none dark:bg-[#0c1829]">
      <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
        Detalle por ítem inspeccionado
      </h2>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Sin ítems de inspección registrados.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#1a2d4d]">
                {(['#', 'N° Parte', 'Nombre de Parte', 'Lote', 'Serie', 'Identificadores', 'Inspeccionadas', 'OK', 'NG', 'Scrap', 'Recuperadas', 'Incidencias'] as const).map(
                  (col, i) => (
                    <th
                      key={col}
                      className={`pb-2.5 text-xs font-bold text-black dark:text-white ${i < 3 ? 'text-left' : 'text-right'} ${i === 0 ? 'w-8 pr-4' : ''} ${i === 1 ? 'min-w-[100px] pr-4' : ''} ${i === 2 ? 'min-w-[140px] pr-4' : ''} ${i > 2 ? 'pl-4' : ''}`}
                    >
                      {col}
                    </th>
                  ),
                )}
                {onEditItem && (
                  <th className="pb-2.5 pl-4 text-right text-xs font-bold text-black dark:text-white">
                    <span className="sr-only">Acciones</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <React.Fragment key={item.id}>
                  <tr className="border-b border-blue-100 dark:border-[#1a2d4d]/50">
                    <td className="py-2.5 pr-4 text-xs tabular-nums text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 pr-4 text-xs text-slate-500 font-mono" title={item.partNumber ?? '—'}>
                      {item.partNumber ?? '—'}
                    </td>
                    <td className="max-w-[180px] truncate py-2.5 pr-4 text-slate-900 dark:text-white" title={item.partName ?? '—'}>
                      {item.partName ?? '—'}
                    </td>
                    <td className="py-2.5 pl-4 text-right text-xs text-slate-400">
                      {item.lote ?? '—'}
                    </td>
                    <td className="py-2.5 pl-4 text-right text-xs text-slate-400">
                      {item.serie ?? '—'}
                    </td>
                    <td className="py-2.5 pl-4 text-right text-xs text-slate-400">
                      {item.identificadores ?? '—'}
                    </td>
                    <td className="py-2.5 pl-4 text-right tabular-nums text-slate-900 dark:text-white">
                      {item.inspected.toLocaleString('es-MX')}
                    </td>
                    <td className={`py-2.5 pl-4 text-right tabular-nums font-medium ${item.ok > 0 ? 'text-green-500' : 'text-slate-400'}`}>
                      {item.ok.toLocaleString('es-MX')}
                    </td>
                    <td className={`py-2.5 pl-4 text-right tabular-nums ${item.ng > 0 ? 'font-bold text-orange-400' : 'text-slate-400'}`}>
                      {item.ng.toLocaleString('es-MX')}
                    </td>
                    <td className={`py-2.5 pl-4 text-right tabular-nums ${item.scrap === 0 ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                      {item.scrap.toLocaleString('es-MX')}
                    </td>
                    <td className="py-2.5 pl-4 text-right tabular-nums text-slate-900 dark:text-white">
                      {item.recovered.toLocaleString('es-MX')}
                    </td>
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
                    {onEditItem && (
                      <td className="py-2.5 pl-4 text-right">
                        <button
                          type="button"
                          onClick={() => onEditItem(item)}
                          aria-label={`Editar ítem ${item.partNumber ?? item.partName ?? item.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-purple-500 bg-purple-500 px-2.5 py-1 text-xs text-white transition-colors hover:border-purple-400 hover:text-slate-200 dark:border-[#1a2d4d] dark:bg-[#0c1829] dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
                        >
                          <Edit2 size={11} aria-hidden="true" />
                          Editar
                        </button>
                      </td>
                    )}
                  </tr>
                {expandedId === item.id && (
                    <tr className="bg-slate-50 dark:bg-[#070e1a]">
                      <td colSpan={colCount} className="px-6 py-3">
                        <ul className="flex flex-col gap-1.5">
                          {item.incidents.map((inc, i) => (
                            <li key={i} className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                              <span>{inc.description}</span>
                              <span className="tabular-nums font-medium">{inc.count}</span>
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
              <tr className="border-t-2 border-slate-100 dark:border-[#1a2d4d]">
                <td colSpan={6} className="py-2.5 text-xs font-semibold text-slate-500">
                  Totales
                </td>
                <td className="py-2.5 pl-4 text-right tabular-nums font-semibold text-slate-900 dark:text-white">
                  {totals.inspected.toLocaleString('es-MX')}
                </td>
                <td className="py-2.5 pl-4 text-right tabular-nums font-semibold text-green-500">
                  {totals.ok.toLocaleString('es-MX')}
                </td>
                <td className="py-2.5 pl-4 text-right tabular-nums font-bold text-orange-400">
                  {totals.ng.toLocaleString('es-MX')}
                </td>
                <td className="py-2.5 pl-4 text-right tabular-nums font-semibold text-slate-900 dark:text-white">
                  {totals.scrap.toLocaleString('es-MX')}
                </td>
                <td className="py-2.5 pl-4 text-right tabular-nums font-semibold text-slate-900 dark:text-white">
                  {totals.recovered.toLocaleString('es-MX')}
                </td>
                <td colSpan={onEditItem ? 2 : 1} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Edit Item Modal ─────────────────────────────────────────────────────────

function EditItemSubmitButton({ disabled: disabledProp }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending || disabledProp}
      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {pending ? 'Guardando...' : 'Guardar cambios'}
    </button>
  )
}

function EditItemModal({
  item,
  reportId,
  state,
  action,
  onClose,
}: {
  item: InspectionItemRow
  reportId: number
  state: UpdateInspectionItemState
  action: (formData: FormData) => void
  onClose: () => void
}) {
  const [motivo, setMotivo] = useState('')
  const [values, setValues] = useState({
    ok: String(item.ok),
    ng: String(item.ng),
    recovered: String(item.recovered),
  })
  const [incidentCounts, setIncidentCounts] = useState<Record<number, string>>(
    Object.fromEntries(item.incidents.map((inc, i) => [i, String(inc.count)]))
  )

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValues((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleIncidentChange(idx: number, value: string) {
    setIncidentCounts((prev) => {
      const next = { ...prev, [idx]: value }
      const newNg = Object.values(next).reduce(
        (acc, v) => acc + Math.max(0, Math.floor(Number(v) || 0)),
        0,
      )
      setValues((vals) => ({ ...vals, ng: String(newNg) }))
      return next
    })
  }

  const okVal = Math.max(0, Math.floor(Number(values.ok) || 0))
  const ngVal = Math.max(0, Math.floor(Number(values.ng) || 0))
  const recoveredVal = Math.max(0, Math.floor(Number(values.recovered) || 0))
  const recoveredExceedsNg = recoveredVal > ngVal
  const computedScrap = Math.max(0, ngVal - recoveredVal)

  const sumMismatch = okVal + ngVal !== item.inspected
  const totalIncidents = Object.values(incidentCounts).reduce(
    (acc, v) => acc + Math.max(0, Math.floor(Number(v) || 0)),
    0,
  )
  const incidentsMismatch = item.incidents.length > 0 && totalIncidents !== ngVal
  const isFormInvalid = sumMismatch || incidentsMismatch || recoveredExceedsNg

  const incidentsJson = JSON.stringify(
    item.incidents.map((inc, i) => ({
      description: inc.description,
      count: Math.max(0, Math.floor(Number(incidentCounts[i]) || 0)),
    }))
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-edit-item-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-fade-in"
    >
      <form
        action={action}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-[#111a30] dark:bg-[#111a30] text-slate-800 dark:text-slate-100 shadow-2xl animate-scale-in"
      >
        <input type="hidden" name="reportId" value={String(reportId)} />
        <input type="hidden" name="itemId" value={String(item.id)} />
        {/* Pass the original total_pieces so the action does not silently derive it from ok+ng */}
        <input type="hidden" name="total" value={String(item.inspected)} />
        <input type="hidden" name="scrap" value={String(computedScrap)} />
        <input type="hidden" name="incidents" value={incidentsJson} />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#25395f] px-5 py-4">
          <h2 id="modal-edit-item-titulo" className="text-sm font-semibold text-slate-900 dark:text-white">
            Editar ítem
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white"
            aria-label="Cerrar modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-5 py-5">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-white" title={`${item.partNumber ?? ''} ${item.partName ?? ''}`}>
            {item.partNumber ? `${item.partNumber} · ` : ''}{item.partName ?? '—'}
          </p>

          <div className="grid grid-cols-2 gap-4">
            {([
              { name: 'ok', label: 'Piezas OK' },
              { name: 'ng', label: 'Piezas NG' },
              { name: 'recovered', label: 'Recuperadas' },
            ] as const).map(({ name, label }) => {
              // Con incidencias, el NG se DERIVA de su suma (read-only): se ajusta bajando/
              // subiendo las incidencias, no el campo directo. Evita que ambos caminos se
              // desincronicen (causa del falso "actualiza las incidencias").
              const ngDerived = name === 'ng' && item.incidents.length > 0
              return (
              <label key={name} className="flex flex-col gap-1.5">
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  {label}
                  {ngDerived && <span className="ml-1 text-[10px] text-slate-400">(según incidencias)</span>}
                </span>
                <input
                  type="number"
                  name={name}
                  min={0}
                  step={1}
                  value={values[name]}
                  onChange={handleChange}
                  readOnly={ngDerived}
                  className={`rounded-md border px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 ${
                    ngDerived
                      ? 'cursor-not-allowed border-slate-300 bg-slate-100 text-slate-500 dark:border-[#31476f] dark:bg-[#0c1426]'
                      : 'border-slate-300 bg-white text-slate-900 dark:border-[#31476f] dark:bg-[#0c1426] dark:text-white'
                  }`}
                />
              </label>
              )
            })}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-slate-600 dark:text-slate-300">Scrap (NG - Recuperadas)</span>
              <div className="cursor-not-allowed rounded-md border border-slate-300 bg-slate-100 dark:border-[#31476f] dark:bg-[#0c1426] px-3 py-2 text-sm text-slate-500 select-none">
                {computedScrap}
              </div>
            </div>
          </div>

          {recoveredExceedsNg && (
            <p className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300">
              Recuperadas ({recoveredVal}) no puede exceder NG ({ngVal}). Se ajustará automáticamente al guardar.
            </p>
          )}

          {item.incidents.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">NG por incidencia</p>
              <div className="flex flex-col gap-2 rounded-lg border border-slate-300 bg-slate-50 dark:border-[#31476f] dark:bg-[#0c1426] p-3">
                {item.incidents.map((inc, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-400" title={inc.description}>
                      {inc.description}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={incidentCounts[i] ?? '0'}
                      onChange={(e) => handleIncidentChange(i, e.target.value)}
                      className="w-20 rounded-md border border-slate-300 bg-white dark:border-[#31476f] dark:bg-[#111a30] px-2 py-1 text-right text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-slate-600 dark:text-slate-300">Motivo de edición <span className="text-red-400">*</span></span>
            <textarea name="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} required
              placeholder="Explica por qué editas este ítem..."
              className="min-h-16 rounded-md border border-slate-300 bg-white dark:border-[#31476f] dark:bg-[#0c1426] px-3 py-2 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 focus:border-blue-500" />
          </label>

          {state && !state.ok && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {state.error}
            </p>
          )}
        </div>

        {/* Banners de validación */}
        <div className="flex flex-col gap-2 px-5 pb-2">
          {sumMismatch && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              Las piezas OK ({okVal}) + NG ({ngVal}) = {okVal + ngVal}, pero deben sumar {item.inspected} (inspeccionadas).
            </p>
          )}
          {incidentsMismatch && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              La suma de incidencias ({totalIncidents}) debe ser igual a las piezas NG ({ngVal}).
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-[#25395f] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 dark:border-[#31476f] px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            Cancelar
          </button>
          <EditItemSubmitButton disabled={isFormInvalid || motivo.trim() === ''} />
        </div>
      </form>
    </div>
  )
}

function TimelineStep({
  label,
  actor,
  date,
  done,
  dotClass,
  detail,
}: {
  label: string
  actor: string
  date: Date | null
  done: boolean
  dotClass: string
  detail?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 flex flex-shrink-0 flex-col items-center">
        <span className={`h-2 w-2 rounded-full ${done ? dotClass : 'bg-slate-600'}`} aria-hidden="true" />
      </div>
      <div className="flex min-w-0 flex-col pb-4">
        <span className={`text-sm font-medium ${done ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
          {label}
        </span>
        {done ? (
          <>
            <span className="truncate text-xs text-slate-500">{actor}</span>
            <span className="text-xs text-slate-500">{formatDate(date)}</span>
            {detail && <span className="text-xs text-slate-500 mt-0.5">{detail}</span>}
          </>
        ) : (
          <span className="text-xs italic text-slate-500">pendiente</span>
        )}
      </div>
    </div>
  )
}

function WorkflowSubmitButton({
  children,
  className,
  disabled,
  name,
  value,
}: {
  children: React.ReactNode
  className: string
  disabled?: boolean
  name?: string
  value?: string
}) {
  const { pending } = useFormStatus()

  return (
    <button type="submit" name={name} value={value} disabled={pending || disabled} className={className}>
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}

function SamplingModal({
  reporte,
  state,
  action,
  defectsByItem,
  setDefectsByItem,
  notes,
  setNotes,
  onClose,
}: {
  reporte: ReporteDetalleData
  state: WorkflowActionState
  action: (formData: FormData) => void
  defectsByItem: Record<number, string>
  setDefectsByItem: React.Dispatch<React.SetStateAction<Record<number, string>>>
  notes: string
  setNotes: React.Dispatch<React.SetStateAction<string>>
  onClose: () => void
}) {
  const totalSample = reporte.samplingItems.reduce((sum, item) => sum + item.sampleSize, 0)
  const totalAllowed = reporte.samplingItems.reduce((sum, item) => sum + item.maxDefects, 0)
  const totalDefects = reporte.samplingItems.reduce(
    (sum, item) => sum + Math.max(0, Math.floor(Number(defectsByItem[item.id]) || 0)),
    0,
  )
  const approves = reporte.samplingItems.length > 0 && reporte.samplingItems.every((item) => {
    const defects = Math.max(0, Math.floor(Number(defectsByItem[item.id]) || 0))
    return defects <= item.maxDefects
  })
  // Rangos de la tabla de muestreo que aplican a este reporte (según piezas inspeccionadas).
  const applicableMins = new Set(reporte.samplingItems.map((item) => item.min))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3 py-4 sm:px-4 sm:py-6 backdrop-blur-sm animate-fade-in">
      <form
        action={action}
        className="flex max-h-[85vh] flex-col w-full max-w-[640px] overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#25395f] dark:bg-[#111a30] text-slate-800 dark:text-slate-100 shadow-2xl animate-scale-in sm:max-h-[90vh]"
      >
        <input type="hidden" name="reportId" value={String(reporte.reportId)} />

        <div className="flex-shrink-0 flex items-center justify-between border-b border-slate-200 dark:border-[#25395f] px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Registrar muestreo de liberacion</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white"
            aria-label="Cerrar modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-4 px-5 py-5">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-slate-600 dark:text-slate-300">Piezas muestreadas</span>
              <input
                readOnly
                value={totalSample}
                className="rounded-md border border-slate-300 bg-slate-100 dark:border-[#31476f] dark:bg-[#0c1426] px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-slate-600 dark:text-slate-300">Hallazgos (defectos)</span>
              <input
                readOnly
                value={totalDefects}
                className="rounded-md border border-slate-300 bg-slate-100 dark:border-[#31476f] dark:bg-[#0c1426] px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
              />
            </label>
          </div>

          <div className="rounded-lg bg-slate-100 dark:bg-[#0c1426] p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">Reglas por item inspeccionado</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  El rango se calcula con las piezas inspeccionadas de cada item.
                </p>
              </div>
              <span
                className={`rounded-full border px-2 py-1 text-xs font-medium ${
                  approves
                    ? 'border-green-500/40 bg-green-500/10 text-green-300'
                    : 'border-red-500/40 bg-red-500/10 text-red-300'
                }`}
              >
                {approves ? 'Aprueba' : 'No aprueba'}
              </span>
            </div>

            {reporte.samplingItems.length === 0 ? (
              <p className="text-sm text-slate-400">No hay items con piezas suficientes para aplicar muestreo.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {reporte.samplingItems.map((item) => {
                  const defects = Math.max(0, Math.floor(Number(defectsByItem[item.id]) || 0))
                  const passes = defects <= item.maxDefects

                  return (
                    <div key={item.id} className="rounded-lg border border-slate-200 bg-white dark:border-[#25395f] dark:bg-[#111a30] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{item.description}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Rango {item.rangeLabel} pzs: muestrear {item.sampleSize} y maximo {item.maxDefects} defectuosa{item.maxDefects !== 1 ? 's' : ''}.
                          </p>
                        </div>
                        <label className="flex w-24 flex-col gap-1">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">Defectos</span>
                          <input
                            type="number"
                            min={0}
                            name={`defects_${item.id}`}
                            value={defectsByItem[item.id] ?? '0'}
                            onChange={(event) =>
                              setDefectsByItem((prev) => ({
                                ...prev,
                                [item.id]: event.target.value,
                              }))
                            }
                            className="rounded-md border border-slate-300 bg-white dark:border-[#31476f] dark:bg-[#0c1426] px-2 py-1.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                          />
                        </label>
                      </div>
                      <p className={`mt-2 text-xs ${passes ? 'text-green-300' : 'text-red-300'}`}>
                        Resultado: {passes ? 'aprueba' : 'no aprueba'} para este item.
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="mt-4 border-t border-slate-300 dark:border-[#25395f] pt-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Resultado calculado: {totalDefects} defecto{totalDefects !== 1 ? 's' : ''} / {totalAllowed} permitidos.
              </p>
            </div>
          </div>

          {/* Tabla de rangos de muestreo (referencia) */}
          <div className="rounded-lg bg-slate-100 dark:bg-[#0c1426] p-4">
            <p className="text-xs font-semibold text-slate-900 dark:text-white">Tabla de muestreo (rangos)</p>
            <p className="mt-0.5 mb-3 text-xs text-slate-500 dark:text-slate-400">
              Tamaño de muestra y máximo de defectos según las piezas inspeccionadas del lote.
              {applicableMins.size > 0 && ' El rango resaltado aplica a este reporte.'}
            </p>
            <div className="rounded-md border border-slate-200 dark:border-[#25395f] max-h-[220px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-[#0c1426]">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold text-black dark:text-white">Rango (pzs)</th>
                    <th className="px-3 py-2 text-right font-bold text-black dark:text-white">Muestrear</th>
                    <th className="px-3 py-2 text-right font-bold text-black dark:text-white">Máx. defectos</th>
                  </tr>
                </thead>
                <tbody>
                  {SAMPLING_RULES.map((rule) => {
                    const aplica = applicableMins.has(rule.min)
                    return (
                      <tr
                        key={rule.min}
                        className={`border-t border-slate-200 dark:border-[#25395f] ${
                          aplica
                            ? 'bg-blue-500/10 font-medium text-slate-900 dark:text-white'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <td className="px-3 py-1.5 text-left">
                          {rule.min.toLocaleString('es-MX')}–{rule.max.toLocaleString('es-MX')}
                          {aplica && (
                            <span className="ml-1.5 rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-600 dark:text-blue-300">
                              aplica
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right">{rule.sampleSize}</td>
                        <td className="px-3 py-1.5 text-right">{rule.maxDefects}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-slate-600 dark:text-slate-300">Notas / motivo (si no aprueba)</span>
            <textarea
              name="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Motivo obligatorio si el muestreo no aprueba..."
              className="min-h-20 rounded-md border border-slate-300 bg-white dark:border-[#31476f] dark:bg-[#0c1426] px-3 py-2 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500"
            />
          </label>

          {state?.error && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {state.error}
            </p>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center justify-between gap-2 border-t border-slate-200 dark:border-[#25395f] px-5 py-4">
          {!approves && (
            <p className="text-xs text-red-500 dark:text-red-300">
              El muestreo no cumple las condiciones. Edita los ítems antes de aprobar.
            </p>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 dark:border-[#31476f] px-4 py-2 text-sm text-slate-600 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10"
            >
              Cancelar
            </button>
            <WorkflowSubmitButton
              name="decision"
              value="approve"
              disabled={!approves}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Aprobar muestreo
            </WorkflowSubmitButton>
          </div>
        </div>
      </form>
    </div>
  )
}

function ConfirmWorkflowModal({
  title,
  description,
  confirmLabel,
  confirmClass,
  consecutiveNumber,
  reportId,
  action,
  state,
  onClose,
}: {
  title: string
  description: string
  confirmLabel: string
  confirmClass: string
  consecutiveNumber: string
  reportId: number
  action: (formData: FormData) => void
  state: WorkflowActionState
  onClose: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <form
        action={action}
        className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-[#25395f] dark:bg-[#111a30] text-slate-800 dark:text-slate-100 shadow-2xl animate-scale-in"
      >
        <input type="hidden" name="reportId" value={String(reportId)} />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#25395f] px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white" aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-5 py-5">
          <p className="text-sm text-slate-600 dark:text-slate-300">{description}</p>

          {'error' in state && state.error && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {state.error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-[#25395f] px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 dark:border-[#31476f] px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10">
            Cancelar
          </button>
          <WorkflowSubmitButton className={confirmClass}>
            {confirmLabel}
          </WorkflowSubmitButton>
        </div>
      </form>
    </div>
  )
}

// Next.js serializa los props Server→Client como JSON, convirtiendo Date → string ISO.
// Este helper rehidrata los campos Date antes de usarlos en el componente.
function toDate(v: Date | string | null): Date | null {
  if (v === null || v === undefined) return null
  if (v instanceof Date) return v
  const d = new Date(v as string)
  return isNaN(d.getTime()) ? null : d
}

export function ReporteDetallePage({ reporte, rol, permisos, backHref = '/supervisor/reportes' }: ReporteDetallePageProps) {
  // Permisos efectivos del usuario → controlan qué botones de workflow se muestran.
  // La frontera real de seguridad sigue siendo cada server action (que vuelve a validar).
  const session: SessionLike = { rol, permisos }
  const canMuestreo = can(session, 'reportes.muestreo')
  const canFirmar = can(session, 'reportes.firmar')
  const canPublicar = can(session, 'reportes.publicar')
  const canEditar = can(session, 'reportes.editar')

  const [samplingOpen, setSamplingOpen] = useState(false)
  const [defectsByItem, setDefectsByItem] = useState<Record<number, string>>({})
  const [samplingNotes, setSamplingNotes] = useState('')
  const [samplingState, samplingAction] = useActionState(registerSamplingAction, {})
  const [signState, signAction] = useActionState(signReporteAction, {})
  const [publishState, publishAction] = useActionState(publishReporteAction, {})
  const [editItem, setEditItem] = useState<InspectionItemRow | null>(null)
  const [editItemState, editItemAction] = useActionState(updateInspectionItemAction, undefined)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  })
  const [showSignConfirm, setShowSignConfirm] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const router = useRouter()

  const {
    reportId,
    consecutiveNumber,
    status,
    cliente,
    planta,
    cotizacion,
    parte,
    totalInspected,
    totalOk,
    totalNg,
    totalScrap,
    totalRecovered,
    totalIncidents,
    pzsPorIncidencia,
    samplingItems,
    inspectionItems,
    operadores,
    turno,
    tabletAlias,
    supervisorName,
    sampleSize,
    sampleNg,
    sampleApproved,
    isLegacy,
    legacyCsvTable,
  } = reporte

  // Rehidratar campos Date que Next.js convirtió a string ISO durante la serialización Server→Client
  const createdAt = toDate(reporte.createdAt)!
  const sessionCreatedAt = toDate(reporte.sessionCreatedAt)
  const sessionFinishedAt = toDate(reporte.sessionFinishedAt)
  const sampledAt = toDate(reporte.sampledAt)
  const signedAt = toDate(reporte.signedAt)
  const publishedAt = toDate(reporte.publishedAt)

  const realTotals = useMemo(() => {
    if (isLegacy) {
      return {
        ok: totalOk,
        ng: totalNg,
        scrap: totalScrap,
        recovered: totalRecovered,
        inspected: totalInspected,
        incidents: totalIncidents,
        pzsPorIncidencia,
      }
    }
    const ok = inspectionItems.reduce((s, i) => s + i.ok, 0)
    const ng = inspectionItems.reduce((s, i) => s + i.ng, 0)
    const scrap = inspectionItems.reduce((s, i) => s + i.scrap, 0)
    const recovered = inspectionItems.reduce((s, i) => s + i.recovered, 0)
    const inspected = inspectionItems.reduce((s, i) => s + i.inspected, 0)
    const incidents = inspectionItems.reduce((s, i) => s + i.incidents.length, 0)
    const computedPzsPorIncidencia = incidents > 0 ? Math.round(ng / incidents) : 0
    return { ok, ng, scrap, recovered, inspected, incidents, pzsPorIncidencia: computedPzsPorIncidencia }
  }, [isLegacy, inspectionItems, totalOk, totalNg, totalScrap, totalRecovered, totalInspected, totalIncidents, pzsPorIncidencia])

  const summarySubtitle = sessionFinishedAt
    ? `enviado por operador ${formatRelativeTime(sessionFinishedAt)}`
    : 'en proceso'

  const ngPct = realTotals.inspected > 0 ? (realTotals.ng / realTotals.inspected) * 100 : 0
  const ngPctDisplay = realTotals.inspected > 0 ? `${ngPct.toFixed(2)}%` : '-'
  const ngPctClass = realTotals.inspected > 0 ? getNgColorClass(ngPct) : 'text-slate-500'

  const isAssigned = sessionCreatedAt !== null
  const isCaptured = sessionFinishedAt !== null
  const isSampling = ['sampling', 'signed', 'published'].includes(status)

  const samplingDetail = isSampling
    ? `${sampleSize} pzs muestreadas · ${sampleNg} NG · ${sampleApproved ? 'Aprobado' : 'No aprobado'}`
    : undefined
  const isSigned = ['signed', 'published'].includes(status)
  const isPublished = status === 'published'

  const operadoresInitials = operadores !== '-' ? getInitials(operadores) : '?'
  const hasOperadores = operadores !== '-'

  const initialDefects = useMemo(() => {
    return Object.fromEntries(samplingItems.map((item) => [item.id, '0']))
  }, [samplingItems])

  useEffect(() => {
    if (samplingState.ok) {
      setSamplingOpen(false)
      router.refresh()
    }
  }, [samplingState.ok, router])

  useEffect(() => {
    if (signState.ok) {
      setShowSignConfirm(false)
      setToast({ message: 'Reporte firmado correctamente', type: 'success', visible: true })
      router.refresh()
    }
  }, [signState.ok, router])

  useEffect(() => {
    if (publishState.ok) {
      setShowPublishConfirm(false)
      setToast({ message: 'Reporte publicado correctamente', type: 'success', visible: true })
      router.refresh()
    }
  }, [publishState.ok, router])

  // Auto-dismiss toast after 3 s
  useEffect(() => {
    if (!toast.visible) return
    const t = setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3000)
    return () => clearTimeout(t)
  }, [toast.visible])

  // Handle edit item result
  useEffect(() => {
    if (editItemState === undefined) return
    if (editItemState.ok) {
      setEditItem(null)
      setToast({ message: 'Ítem actualizado correctamente', type: 'success', visible: true })
      router.refresh()
    } else {
      setToast({ message: editItemState.error ?? 'Error al actualizar', type: 'error', visible: true })
    }
  }, [editItemState, router])

  function openSamplingModal() {
    setDefectsByItem(initialDefects)
    setSamplingNotes('')
    setSamplingOpen(true)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
        <div className="flex flex-wrap items-start gap-4">
          {/* Left: back button + consecutive number + client-plant-quote */}
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={backHref}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white bg-white text-slate-600 transition-colors hover:text-slate-900 dark:border-[#1a2d4d] dark:bg-[#0c1829] dark:text-slate-400 dark:hover:text-white"
                aria-label="Regresar a reportes"
              >
                <ArrowLeft size={16} />
              </Link>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{consecutiveNumber}</h1>
            </div>
            <p className="pl-11 text-sm text-slate-500">
              {cliente} - {planta} - {cotizacion}
            </p>
          </div>

          {/* Right: status badge + workflow buttons — ml-auto anchors to the right even when wrapping */}
          <div className="ml-auto flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
            <StatusBadge status={status} />

            {/* submitted → registrar muestreo */}
            {!isLegacy && status === 'submitted' && canMuestreo && (
              <button
                type="button"
                onClick={openSamplingModal}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
              >
                <CheckCircle2 size={14} aria-hidden="true" />
                Registrar muestreo
              </button>
            )}

            {/* sampling → firmar */}
            {!isLegacy && status === 'sampling' && canFirmar && (
              <button
                type="button"
                onClick={() => setShowSignConfirm(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
              >
                Firmar reporte
              </button>
            )}

            {/* signed → publicar */}
            {!isLegacy && status === 'signed' && canPublicar && (
              <button
                type="button"
                onClick={() => setShowPublishConfirm(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-500"
              >
                Publicar
              </button>
            )}

            {/* published → indicador final */}
            {isPublished && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-2 text-sm font-medium text-green-400 border border-green-500/20">
                <CheckCircle2 size={14} aria-hidden="true" />
                Publicado
              </span>
            )}
          </div>
        </div>

        {isLegacy && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-300">
            Reporte historico del sistema anterior. Datos en modo solo-lectura.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5">
            <div className="sm:col-span-1 lg:col-span-3 flex flex-col">
              <div className="flex h-full flex-col gap-4 rounded-xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white p-5 dark:border-[#0c1829] dark:shadow-none dark:bg-[#0c1829]">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Datos del servicio</h2>
                <dl className="flex flex-col gap-2.5">
                  {(
                    [
                      ['Cliente', cliente],
                      ['Planta', planta],
                      ['Cotizacion', cotizacion],
                      ['# Parte', parte],
                      ['Turno', turno],
                      ['Operadores', operadores],
                      ['Lote esperado', totalInspected > 0 ? totalInspected.toLocaleString('es-MX') : '-'],
                    ] as [string, string][]
                  ).map(([label, value]) => (
                    <div key={label} className="flex min-w-0 items-baseline justify-between gap-2">
                      <dt className="flex-shrink-0 text-xs text-slate-500">{label}</dt>
                      <dd className="max-w-[130px] truncate text-right text-sm font-medium text-slate-900 dark:text-white">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            <div className="sm:col-span-2 lg:col-span-6 flex flex-col gap-5">
              <div className="flex flex-1 flex-col gap-4 rounded-xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white p-5 dark:border-[#0c1829] dark:shadow-none dark:bg-[#0c1829]">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Resumen de piezas inspeccionadas
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">{summarySubtitle}</p>
                </div>

                {inspectionItems.length === 0 && !isLegacy ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-10">
                    <Clock size={32} className="text-amber-400/60" aria-hidden="true" />
                    <p className="text-sm font-medium text-slate-400">Esperando captura del inspector</p>
                    <p className="text-xs text-slate-500">
                      El reporte está pendiente en {tabletAlias || 'Sin tablet asignada'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <MiniStatCard label="Piezas OK" value={realTotals.ok} valueClass="text-green-500" />
                      <MiniStatCard label="Piezas NG" value={realTotals.ng} valueClass="text-orange-400" warning={realTotals.ng > 0} />
                      <MiniStatCard label="Scrap" value={realTotals.scrap} />
                      <MiniStatCard label="Recuperadas" value={realTotals.recovered} />
                      <MiniStatCard label="Incidencias" value={realTotals.incidents} />
                      <MiniStatCard label="Pzs / incidencia" value={realTotals.pzsPorIncidencia} />
                    </div>

                    <div className="flex flex-col gap-2 border-t border-blue-200 pt-3 dark:border-[#1a2d4d]">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Total inspeccionadas</span>
                        <span className="font-medium tabular-nums text-slate-900 dark:text-white">
                          {realTotals.inspected.toLocaleString('es-MX')} pzs
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">% NG</span>
                        <span className={`font-medium tabular-nums ${ngPctClass}`}>{ngPctDisplay}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white p-5 dark:border-[#0c1829] dark:shadow-none dark:bg-[#0c1829]">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Asignacion</h2>
                {hasOperadores ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                        {operadoresInitials}
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium text-slate-900 dark:text-white">{operadores}</span>
                        <span className="text-xs text-slate-500">{turno}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 pl-0.5">
                      <TabletSmartphone size={14} className="flex-shrink-0 text-slate-500" aria-hidden="true" />
                      <span className="text-xs text-slate-500">{tabletAlias}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Sin asignacion</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-1 lg:col-span-3 flex flex-col">
              <div className="flex h-full flex-col gap-4 rounded-xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white p-5 dark:border-[#0c1829] dark:shadow-none dark:bg-[#0c1829]">
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="flex-shrink-0 text-slate-500" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Historial</h2>
                </div>

                <div className="flex flex-col" role="list" aria-label="Historial de etapas del reporte">
                  <TimelineStep label="Creado por supervisor" actor={supervisorName} date={createdAt} done dotClass="bg-green-400" />
                  <TimelineStep label="Asignado a operador" actor={operadores} date={sessionCreatedAt} done={isAssigned} dotClass="bg-green-400" />
                  <TimelineStep label="Capturado por operador" actor={operadores} date={sessionFinishedAt} done={isCaptured} dotClass="bg-green-400" />
                  <TimelineStep label="Muestreo aprobado" actor={supervisorName} date={sampledAt} done={isSampling} dotClass="bg-blue-400" detail={samplingDetail} />
                  <TimelineStep label="Firmado" actor={supervisorName} date={signedAt} done={isSigned} dotClass="bg-slate-400" />
                  <TimelineStep label="Publicado" actor={supervisorName} date={publishedAt} done={isPublished} dotClass="bg-green-400" />
                </div>
              </div>
            </div>
        </div>

        {isLegacy ? (
          <LegacyCsvTable items={Array.isArray(legacyCsvTable) ? legacyCsvTable : []} />
        ) : (
          <InspectionItemsTable
            items={inspectionItems}
            totals={realTotals}
            onEditItem={status === 'submitted' && canEditar ? setEditItem : undefined}
          />
        )}
      </div>


      {samplingOpen && (
        <SamplingModal
          reporte={reporte}
          state={samplingState}
          action={samplingAction}
          defectsByItem={defectsByItem}
          setDefectsByItem={setDefectsByItem}
          notes={samplingNotes}
          setNotes={setSamplingNotes}
          onClose={() => setSamplingOpen(false)}
        />
      )}

      {editItem && (
        <EditItemModal
          item={editItem}
          reportId={reportId}
          state={editItemState}
          action={editItemAction}
          onClose={() => setEditItem(null)}
        />
      )}

      {showSignConfirm && (
        <ConfirmWorkflowModal
          title="Firmar reporte"
          description={`¿Confirmas que deseas firmar el reporte ${consecutiveNumber}? Esta acción no se puede deshacer.`}
          confirmLabel="Firmar"
          confirmClass="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
          consecutiveNumber={consecutiveNumber}
          reportId={reportId}
          action={signAction}
          state={signState}
          onClose={() => setShowSignConfirm(false)}
        />
      )}

      {showPublishConfirm && (
        <ConfirmWorkflowModal
          title="Publicar reporte"
          description={`¿Confirmas que deseas publicar el reporte ${consecutiveNumber}? El reporte quedará visible para el cliente.`}
          confirmLabel="Publicar"
          confirmClass="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-60 disabled:cursor-not-allowed"
          consecutiveNumber={consecutiveNumber}
          reportId={reportId}
          action={publishAction}
          state={publishState}
          onClose={() => setShowPublishConfirm(false)}
        />
      )}

      {/* Toast */}
      {toast.visible && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-5 py-3.5 shadow-2xl transition-all animate-slide-in-right ${
            toast.type === 'success'
              ? 'border-green-500/50 bg-white dark:bg-[#0c1829]'
              : 'border-red-500/30 bg-white dark:bg-[#0c1829]'
          }`}
        >
          <span
            className={`h-2 w-2 flex-shrink-0 rounded-full ${
              toast.type === 'success' ? 'bg-green-400 animate-pulse-dot' : 'bg-red-400'
            }`}
            aria-hidden="true"
          />
          <p className="text-sm text-slate-700 dark:text-slate-200">{toast.message}</p>
        </div>
      )}
    </div>
  )
}
