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
  FlaskConical,
  Loader2,
  PenLine,
  X,
} from 'lucide-react'
import type { InspectionItemRow, ReporteDetalleData } from '@/back/services/reporteDetalleService'
import { LegacyCsvTable } from '@/front/components/supervisor/LegacyCsvTable'
import {
  publishReporteAction,
  registrarMuestreoDetalleAction,
  signReporteAction,
  type MuestreoDetalleState,
  type WorkflowActionState,
} from '@/app/actions/reporte-workflow'
import {
  updateInspectionItemAction,
  type UpdateInspectionItemState,
} from '@/app/actions/update-inspection-item'
import {
  registrarMuestreoDetalleInformalAction,
  signInformalReporteAction,
} from '@/app/actions/informal-report-workflow'
import { updateInformalReportItemAction } from '@/app/actions/update-informal-report-item'
import { can, type SessionLike } from '@/front/lib/permisos'
import { getSamplingRule } from '@/front/lib/sampling'

interface ReporteDetallePageProps {
  reporte: ReporteDetalleData
  /** Permisos efectivos del usuario, para decidir qué acciones de workflow mostrar. */
  rol: string
  permisos?: string[] | null
  /** Destino del botón "volver". Por defecto la lista de reportes del supervisor. */
  backHref?: string
  /**
   * 'informal' reusa este mismo componente para reportes de órdenes informales:
   * usa las acciones de workflow informales, gatea por los permisos
   * `reportes_informales.*` en vez de `reportes.*`, y oculta por completo el
   * botón "Publicar" y el paso "Publicado" del historial (los reportes
   * informales nunca se publican — el flujo termina en "Firmado"). Por
   * defecto 'formal', que se comporta exactamente igual que antes.
   */
  variant?: 'formal' | 'informal'
  /**
   * ¿El usuario actual (quien ve la página) tiene su firma configurada? La
   * firma es obligatoria para firmar — si es `false`, el botón "Firmar
   * reporte" se deshabilita aunque el reporte ya esté totalmente muestreado.
   * Por defecto `false` (p. ej. el portal de gerente, que es solo lectura y
   * nunca muestra el botón de firmar de todos modos).
   */
  currentUserHasSignature?: boolean
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

function ItemSamplingBadge({ sampling }: { sampling: InspectionItemRow['sampling'] }) {
  if (sampling.sampled) {
    if (sampling.result === 'no_aprobado') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-600 dark:bg-red-400" aria-hidden="true" />
          No aprobado
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-green-300 bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400">
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-600 dark:bg-green-400" aria-hidden="true" />
        Muestreado
      </span>
    )
  }
  if (sampling.required) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-600 dark:bg-amber-400" aria-hidden="true" />
        Sin muestrear
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:border-[#1a2d4d] dark:bg-[#1a2d4d]/40 dark:text-slate-400">
      No aplica
    </span>
  )
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
  onMuestreo,
  onVerDetalle,
}: {
  items: InspectionItemRow[]
  totals: { inspected: number; ok: number; ng: number; scrap: number; recovered: number }
  onEditItem?: (item: InspectionItemRow) => void
  onMuestreo?: (item: InspectionItemRow) => void
  onVerDetalle?: (item: InspectionItemRow) => void
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const hasActions = Boolean(onEditItem || onMuestreo)
  const colCount = hasActions ? 14 : 13

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
                {(['#', 'N° Parte', 'Nombre de Parte', 'Lote', 'Serie', 'Identificadores', 'Inspeccionadas', 'OK', 'NG', 'Scrap', 'Recuperadas', 'Incidencias', 'Muestreo'] as const).map(
                  (col, i) => (
                    <th
                      key={col}
                      className={`pb-2.5 text-xs font-bold text-black dark:text-white ${i < 3 ? 'text-left' : 'text-right'} ${i === 0 ? 'w-8 pr-4' : ''} ${i === 1 ? 'min-w-[100px] pr-4' : ''} ${i === 2 ? 'min-w-[140px] pr-4' : ''} ${i > 2 ? 'pl-4' : ''}`}
                    >
                      {col}
                    </th>
                  ),
                )}
                {hasActions && (
                  <th className="pb-2.5 pl-4 text-right text-xs font-bold text-black dark:text-white">
                    <span className="sr-only">Acciones</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <React.Fragment key={item.id}>
                  <tr
                    onClick={onVerDetalle ? () => onVerDetalle(item) : undefined}
                    className={`border-b border-blue-100 dark:border-[#1a2d4d]/50 ${onVerDetalle ? 'cursor-pointer transition-colors hover:bg-blue-50/60 dark:hover:bg-[#1a2d4d]/40' : ''}`}
                  >
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
                          onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === item.id ? null : item.id) }}
                          className="inline-flex min-w-[24px] items-center justify-center rounded-full bg-orange-400/10 px-2 py-0.5 text-xs font-medium text-orange-400 transition-colors hover:bg-orange-400/20"
                        >
                          {item.incidents.length}
                        </button>
                      )}
                    </td>
                    <td className="py-2.5 pl-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <ItemSamplingBadge sampling={item.sampling} />
                        {item.sampling.needsEdit && (
                          <span className="max-w-[170px] text-right text-[10px] leading-tight text-red-500 dark:text-red-400">
                            Edita la información del ítem para volver a habilitar el muestreo.
                          </span>
                        )}
                      </div>
                    </td>
                    {hasActions && (
                      <td className="py-2.5 pl-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onMuestreo && item.sampling.required && (() => {
                            const yaAprobado = item.sampling.sampled && item.sampling.result === 'aprobado'
                            const muestreoDisabled = item.sampling.needsEdit || yaAprobado
                            return (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onMuestreo(item) }}
                                disabled={muestreoDisabled}
                                title={
                                  item.sampling.needsEdit
                                    ? 'Muestreo no aprobado: edita la información del ítem para volver a habilitarlo'
                                    : yaAprobado
                                      ? 'Este ítem ya fue muestreado y aprobado'
                                      : 'Muestreo'
                                }
                                aria-label={`Muestrear ítem ${item.partNumber ?? item.partName ?? item.id}`}
                                className={`inline-flex items-center justify-center rounded-md p-1.5 transition-colors ${
                                  muestreoDisabled
                                    ? 'cursor-not-allowed text-slate-300 dark:text-slate-600'
                                    : 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10'
                                }`}
                              >
                                <FlaskConical size={14} aria-hidden="true" />
                              </button>
                            )
                          })()}
                          {onEditItem && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onEditItem(item) }}
                              title="Editar"
                              aria-label={`Editar ítem ${item.partNumber ?? item.partName ?? item.id}`}
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-[#1a2d4d] dark:hover:text-white"
                            >
                              <Edit2 size={14} aria-hidden="true" />
                            </button>
                          )}
                        </div>
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
                <td colSpan={hasActions ? 3 : 2} />
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

  // Identificadores editables: lote, serie y pares { tipo: valor } (LPN, ASN, …).
  const [lote, setLote] = useState(item.lote ?? '')
  const [serie, setSerie] = useState(item.serie ?? '')
  const [identifiers, setIdentifiers] = useState<{ type: string; value: string }[]>(
    Object.entries(item.identificadoresRaw ?? {}).map(([type, value]) => ({ type, value: String(value) }))
  )

  function updateIdentifier(idx: number, field: 'type' | 'value', v: string) {
    setIdentifiers((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: v } : row)))
  }
  function addIdentifier() {
    setIdentifiers((prev) => [...prev, { type: '', value: '' }])
  }
  function removeIdentifier(idx: number) {
    setIdentifiers((prev) => prev.filter((_, i) => i !== idx))
  }

  // Solo se envían los pares completos (tipo y valor no vacíos).
  const identificadoresJson = JSON.stringify(
    Object.fromEntries(
      identifiers
        .map(({ type, value }) => [type.trim(), value.trim()] as const)
        .filter(([t, v]) => t !== '' && v !== '')
    )
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
        <input type="hidden" name="identificadores" value={identificadoresJson} />

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

          {/* Identificadores: lote, serie y pares tipo/valor (varían por planta) */}
          <div className="flex flex-col gap-3 rounded-lg border border-slate-300 bg-slate-50 dark:border-[#31476f] dark:bg-[#0c1426] p-3">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Identificadores</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-slate-500 dark:text-slate-400">Lote</span>
                <input
                  type="text"
                  name="lote"
                  value={lote}
                  onChange={(e) => setLote(e.target.value)}
                  placeholder="—"
                  className="rounded-md border border-slate-300 bg-white dark:border-[#31476f] dark:bg-[#111a30] px-3 py-2 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-slate-500 dark:text-slate-400">Serie</span>
                <input
                  type="text"
                  name="serie"
                  value={serie}
                  onChange={(e) => setSerie(e.target.value)}
                  placeholder="—"
                  className="rounded-md border border-slate-300 bg-white dark:border-[#31476f] dark:bg-[#111a30] px-3 py-2 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                />
              </label>
            </div>

            {/* Pares tipo/valor — el tipo es libre (con sugerencias) porque varía por planta */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Otros identificadores</span>
              <datalist id="tipos-identificador">
                <option value="LPN" />
                <option value="ASN" />
                <option value="TAG" />
                <option value="PALLET" />
                <option value="CAJA" />
              </datalist>
              {identifiers.length === 0 && (
                <p className="text-xs text-slate-400">Sin identificadores adicionales.</p>
              )}
              {identifiers.map((idf, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    list="tipos-identificador"
                    value={idf.type}
                    onChange={(e) => updateIdentifier(i, 'type', e.target.value)}
                    placeholder="Tipo (LPN, ASN…)"
                    aria-label={`Tipo del identificador ${i + 1}`}
                    className="w-1/3 min-w-0 rounded-md border border-slate-300 bg-white dark:border-[#31476f] dark:bg-[#111a30] px-2 py-1.5 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                  />
                  <input
                    type="text"
                    value={idf.value}
                    onChange={(e) => updateIdentifier(i, 'value', e.target.value)}
                    placeholder="Valor"
                    aria-label={`Valor del identificador ${i + 1}`}
                    className="flex-1 min-w-0 rounded-md border border-slate-300 bg-white dark:border-[#31476f] dark:bg-[#111a30] px-2 py-1.5 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => removeIdentifier(i)}
                    aria-label={`Quitar identificador ${i + 1}`}
                    className="flex-shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addIdentifier}
                className="self-start rounded-md border border-dashed border-slate-300 dark:border-[#31476f] px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
              >
                + Agregar identificador
              </button>
            </div>
          </div>

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
  children,
}: {
  label: string
  actor: string
  date: Date | null
  done: boolean
  dotClass: string
  detail?: string
  children?: React.ReactNode
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
            {children}
          </>
        ) : (
          <span className="text-xs italic text-slate-500">pendiente</span>
        )}
      </div>
    </div>
  )
}

/**
 * Miniatura de una firma servida vía el proxy autenticado `/api/signatures/...`.
 * Se oculta a sí misma si la imagen falla a cargar (404 — el firmante borró su
 * firma después de firmar, o el reporte informal no expone un userId numérico).
 */
function SignatureThumbnail({ src, alt }: { src: string; alt: string }) {
  const [hidden, setHidden] = useState(false)
  if (hidden) return null
  return (
    <div className="mt-1.5 inline-flex rounded-md border border-slate-200 bg-white p-1 dark:border-[#1a2d4d]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-16 max-w-[140px] object-contain"
        onError={() => setHidden(true)}
      />
    </div>
  )
}

// Modal para mostrar la firma en grande (se abre desde el enlace "Ver firma").
function SignatureModal({ src, title, onClose }: { src: string; title: string; onClose: () => void }) {
  const [error, setError] = useState(false)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white text-slate-800 shadow-2xl animate-scale-in dark:border-[#111a30] dark:bg-[#111a30] dark:text-slate-100"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-[#25395f]">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex items-center justify-center bg-white p-6 dark:bg-white/95">
          {error ? (
            <p className="py-8 text-sm text-slate-500">No se pudo cargar la firma.</p>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={src}
              alt={title}
              className="max-h-64 max-w-full object-contain"
              onError={() => setError(true)}
            />
          )}
        </div>
        <div className="flex justify-end border-t border-slate-200 px-5 py-4 dark:border-[#25395f]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-[#31476f] dark:text-slate-300 dark:hover:bg-white/10"
          >
            Cerrar
          </button>
        </div>
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

// ─── Muestreo por-detalle Modal ──────────────────────────────────────────────

function MuestreoDetalleModal({
  item,
  reportId,
  action,
  onClose,
  onSuccess,
}: {
  item: InspectionItemRow
  reportId: number
  action: (prevState: MuestreoDetalleState, formData: FormData) => Promise<MuestreoDetalleState>
  onClose: () => void
  onSuccess: () => void
}) {
  const [state, formAction] = useActionState(action, {})
  const [defects, setDefects] = useState('0')
  const rule = getSamplingRule(item.inspected)
  const succeeded = state.ok === true

  useEffect(() => {
    if (state.ok === true) {
      onSuccess()
    }
    // Solo debe dispararse cuando cambia el resultado de la acción, no en cada
    // render (onSuccess se recrea en el padre).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-muestreo-detalle-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-fade-in"
    >
      <form
        action={formAction}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-[#111a30] dark:bg-[#111a30] text-slate-800 dark:text-slate-100 shadow-2xl animate-scale-in"
      >
        <input type="hidden" name="reportId" value={String(reportId)} />
        <input type="hidden" name="item_id" value={String(item.id)} />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#25395f] px-5 py-4">
          <h2 id="modal-muestreo-detalle-titulo" className="text-sm font-semibold text-slate-900 dark:text-white">
            Muestreo de liberación
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
          <div>
            <p className="truncate text-sm font-medium text-slate-900 dark:text-white" title={`${item.partNumber ?? ''} ${item.partName ?? ''}`}>
              {item.partNumber ? `${item.partNumber} · ` : ''}{item.partName ?? '—'}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {item.inspected.toLocaleString('es-MX')} piezas inspeccionadas
            </p>
          </div>

          {rule && (
            <p className="rounded-md bg-slate-100 dark:bg-[#0c1426] px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
              Muestrear {rule.sampleSize} pieza{rule.sampleSize !== 1 ? 's' : ''} · máximo {rule.maxDefects} defectuosa{rule.maxDefects !== 1 ? 's' : ''}
            </p>
          )}

          {succeeded ? (
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                state.approved
                  ? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-300'
                  : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300'
              }`}
            >
              {state.approved
                ? 'Muestreo aprobado.'
                : 'Muestreo NO aprobado: se hallaron más defectos de los permitidos.'}
            </div>
          ) : (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-slate-600 dark:text-slate-300">Piezas malas</span>
                <input
                  type="number"
                  name="defects"
                  min={0}
                  step={1}
                  value={defects}
                  onChange={(e) => setDefects(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white dark:border-[#31476f] dark:bg-[#0c1426] px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  Observaciones <span className="text-slate-400">(opcional)</span>
                </span>
                <textarea
                  name="observations"
                  rows={2}
                  placeholder="Notas del muestreo..."
                  className="min-h-16 rounded-md border border-slate-300 bg-white dark:border-[#31476f] dark:bg-[#0c1426] px-3 py-2 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                />
              </label>

              {state.ok === false && (
                <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {state.error}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-[#25395f] px-5 py-4">
          {succeeded ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 dark:border-[#31476f] px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
            >
              Cerrar
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-slate-300 dark:border-[#31476f] px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                Cancelar
              </button>
              <WorkflowSubmitButton className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed">
                Realizar muestreo
              </WorkflowSubmitButton>
            </>
          )}
        </div>
      </form>
    </div>
  )
}

// ─── Detalle del ítem (read-only) ─────────────────────────────────────────────
// Al presionar un renglón de la tabla se abre este modal con el detalle del
// muestreo (resultado, quién, cuándo, observaciones) y demás datos del ítem.

function ItemDetalleModal({ item, onClose }: { item: InspectionItemRow; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const s = item.sampling
  const idPairs = Object.entries(item.identificadoresRaw ?? {})
  const fmtDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString('es-MX', {
          day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
        })
      : '—'

  const piezas = [
    { label: 'Inspeccionadas', value: item.inspected, cls: 'text-slate-900 dark:text-white' },
    { label: 'OK', value: item.ok, cls: 'text-green-600 dark:text-green-400' },
    { label: 'NG', value: item.ng, cls: 'text-orange-500 dark:text-orange-400' },
    { label: 'Scrap', value: item.scrap, cls: 'text-slate-700 dark:text-slate-300' },
    { label: 'Recuperadas', value: item.recovered, cls: 'text-slate-700 dark:text-slate-300' },
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-item-detalle-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-[#111a30] dark:bg-[#111a30] text-slate-800 dark:text-slate-100 shadow-2xl animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-[#25395f] px-5 py-4">
          <div className="min-w-0">
            <h2 id="modal-item-detalle-titulo" className="text-sm font-semibold text-slate-900 dark:text-white">
              Detalle del ítem inspeccionado
            </h2>
            <p className="mt-0.5 truncate text-xs text-slate-500" title={`${item.partNumber ?? ''} ${item.partName ?? ''}`}>
              {item.partNumber && <span className="font-mono">{item.partNumber}</span>}
              {item.partNumber && item.partName ? ' · ' : ''}
              {item.partName ?? ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-5 px-5 py-5">
          {/* Piezas */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Piezas</h3>
            <div className="grid grid-cols-3 gap-2">
              {piezas.map((c) => (
                <div key={c.label} className="rounded-md border border-slate-200 dark:border-[#25395f] px-3 py-2">
                  <p className="text-[11px] text-slate-500">{c.label}</p>
                  <p className={`tabular-nums text-sm font-semibold ${c.cls}`}>{c.value.toLocaleString('es-MX')}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Identificadores */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Identificadores</h3>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-[11px] text-slate-500">Lote</dt>
                <dd className="font-mono">{item.lote ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Serie</dt>
                <dd className="font-mono">{item.serie ?? '—'}</dd>
              </div>
            </dl>
            {idPairs.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {idPairs.map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-[#0c1426] px-2 py-1 text-xs">
                    <span className="font-semibold text-slate-500">{k}:</span>
                    <span className="font-mono">{v}</span>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Incidencias */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Incidencias</h3>
            {item.incidents.length === 0 ? (
              <p className="text-sm text-slate-500">Sin incidencias.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {item.incidents.map((inc, i) => (
                  <li key={i} className="flex items-center justify-between rounded-md bg-slate-50 dark:bg-[#0c1426] px-3 py-1.5">
                    <span className="min-w-0 truncate text-slate-700 dark:text-slate-300" title={inc.description}>{inc.description}</span>
                    <span className="ml-2 tabular-nums font-medium text-orange-500">{inc.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Muestreo */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Muestreo</h3>
            {!s.required ? (
              <p className="text-sm text-slate-500">Este ítem no requiere muestreo (piezas insuficientes).</p>
            ) : !s.sampled ? (
              <p className="text-sm text-slate-500">
                Sin muestrear.{s.needsEdit ? ' Edita la información del ítem para volver a habilitar el muestreo.' : ''}
              </p>
            ) : (
              <div className="flex flex-col gap-2 rounded-lg border border-slate-200 dark:border-[#25395f] p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Resultado</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.result === 'aprobado'
                        ? 'bg-green-500/10 text-green-600 dark:text-green-300'
                        : 'bg-red-500/10 text-red-600 dark:text-red-300'
                    }`}
                  >
                    {s.result === 'aprobado' ? 'Aprobado' : 'No aprobado'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Piezas muestreadas</span>
                  <span className="tabular-nums">{s.sampledPieces}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Defectos hallados</span>
                  <span className="tabular-nums">{s.ng ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Muestreó</span>
                  <span className="truncate text-right">{s.sampledByName ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Fecha</span>
                  <span className="text-right">{fmtDate(s.sampledAt)}</span>
                </div>
                <div className="flex flex-col gap-1 border-t border-slate-200 dark:border-[#25395f] pt-2">
                  <span className="text-slate-500">Observaciones</span>
                  <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                    {s.observations?.trim() ? s.observations : '—'}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-200 dark:border-[#25395f] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 dark:border-[#31476f] px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            Cerrar
          </button>
        </div>
      </div>
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
  children,
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
  children?: React.ReactNode
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

          {children}

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

export function ReporteDetallePage({
  reporte,
  rol,
  permisos,
  backHref = '/supervisor/reportes',
  variant = 'formal',
  currentUserHasSignature = false,
}: ReporteDetallePageProps) {
  const isInformal = variant === 'informal'

  // Permisos efectivos del usuario → controlan qué botones de workflow se muestran.
  // La frontera real de seguridad sigue siendo cada server action (que vuelve a validar).
  // La variante 'informal' gatea por los permisos `reportes_informales.*` — los
  // reportes informales nunca se publican, así que `canPublicar` siempre es false ahí.
  const session: SessionLike = { rol, permisos }
  const canMuestreo = can(session, isInformal ? 'reportes_informales.muestreo' : 'reportes.muestreo')
  const canFirmar = can(session, isInformal ? 'reportes_informales.firmar' : 'reportes.firmar')
  const canPublicar = !isInformal && can(session, 'reportes.publicar')
  const canEditar = can(session, isInformal ? 'reportes_informales.editar' : 'reportes.editar')

  const [muestreoItem, setMuestreoItem] = useState<InspectionItemRow | null>(null)
  const [detalleItem, setDetalleItem] = useState<InspectionItemRow | null>(null)
  const [firmaModal, setFirmaModal] = useState<{ src: string; title: string } | null>(null)
  const muestreoDetalleAction = isInformal ? registrarMuestreoDetalleInformalAction : registrarMuestreoDetalleAction
  const [signState, signAction] = useActionState(
    isInformal ? signInformalReporteAction : signReporteAction,
    {},
  )
  // Publicar no existe en el flujo informal — el botón/modal correspondiente
  // nunca se renderiza para esa variante, así que esta action queda sin uso ahí.
  const [publishState, publishAction] = useActionState(publishReporteAction, {})
  const [editItem, setEditItem] = useState<InspectionItemRow | null>(null)
  const [editItemState, editItemAction] = useActionState(
    isInformal ? updateInformalReportItemAction : updateInspectionItemAction,
    undefined,
  )
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
    inspectionItems,
    operadores,
    turno,
    supervisorName,
    signedBy,
    signedByName,
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
  const isSampling = ['sampling', 'signed', 'published'].includes(status)

  const samplingDetail = isSampling
    ? `${sampleSize} pzs muestreadas · ${sampleNg} NG · ${sampleApproved ? 'Aprobado' : 'No aprobado'}`
    : undefined
  const isSigned = ['signed', 'published'].includes(status)
  const isPublished = status === 'published'

  const operadoresInitials = operadores !== '-' ? getInitials(operadores) : '?'
  const hasOperadores = operadores !== '-'

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

            {/* firmar: visible desde 'submitted', pero habilitado solo cuando el
                reporte está totalmente muestreado (status derivado 'sampling') Y
                el usuario actual tiene su firma configurada (obligatoria). */}
            {!isLegacy && canFirmar && (status === 'submitted' || status === 'sampling') && (() => {
              const notSampled = status !== 'sampling'
              const signDisabled = notSampled || !currentUserHasSignature
              const signTitle = notSampled
                ? 'Faltan detalles por muestrear (o aprobar) para poder firmar'
                : !currentUserHasSignature
                  ? 'Configura tu firma en Configuración › Mi firma para poder firmar.'
                  : undefined
              return (
                <button
                  type="button"
                  onClick={() => setShowSignConfirm(true)}
                  disabled={signDisabled}
                  title={signTitle}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    !signDisabled
                      ? 'bg-blue-600 text-white hover:bg-blue-500'
                      : 'cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-700/60 dark:text-slate-500'
                  }`}
                >
                  Firmar reporte
                </button>
              )
            })()}

            {/* signed → publicar (no existe en el flujo informal) */}
            {!isLegacy && !isInformal && status === 'signed' && canPublicar && (
              <button
                type="button"
                onClick={() => setShowPublishConfirm(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-500"
              >
                Publicar
              </button>
            )}

            {/* published → indicador final */}
            {!isInformal && isPublished && (
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

        {!isLegacy && canFirmar && status === 'sampling' && !currentUserHasSignature && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            Configura tu firma en Configuración › Mi firma para poder firmar este reporte.
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
                      El reporte está pendiente de captura
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
                  <TimelineStep label="Muestreo aprobado" actor={supervisorName} date={sampledAt} done={isSampling} dotClass="bg-blue-400" detail={samplingDetail} />
                  <TimelineStep label="Firmado" actor={signedByName || supervisorName} date={signedAt} done={isSigned} dotClass="bg-slate-400">
                    {isSigned && signedBy != null && (
                      <button
                        type="button"
                        onClick={() =>
                          setFirmaModal({
                            src: `/api/signatures/${signedBy}`,
                            title: `Firma de ${signedByName || 'el firmante'}`,
                          })
                        }
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        <PenLine size={12} aria-hidden="true" />
                        Ver firma
                      </button>
                    )}
                  </TimelineStep>
                  {!isInformal && (
                    <TimelineStep label="Publicado" actor={supervisorName} date={publishedAt} done={isPublished} dotClass="bg-green-400" />
                  )}
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
            onMuestreo={status === 'submitted' && canMuestreo ? setMuestreoItem : undefined}
            onVerDetalle={setDetalleItem}
          />
        )}
      </div>


      {muestreoItem && (
        <MuestreoDetalleModal
          key={muestreoItem.id}
          item={muestreoItem}
          reportId={reportId}
          action={muestreoDetalleAction}
          onClose={() => setMuestreoItem(null)}
          onSuccess={() => router.refresh()}
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

      {detalleItem && (
        <ItemDetalleModal item={detalleItem} onClose={() => setDetalleItem(null)} />
      )}

      {firmaModal && (
        <SignatureModal src={firmaModal.src} title={firmaModal.title} onClose={() => setFirmaModal(null)} />
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
        >
          {currentUserHasSignature && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-500">Tu firma</span>
              <SignatureThumbnail src="/api/signatures/me" alt="Vista previa de tu firma" />
            </div>
          )}
        </ConfirmWorkflowModal>
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
