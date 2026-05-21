'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  Briefcase,
  Calendar,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  TabletSmartphone,
  X,
} from 'lucide-react'
import type { DailyReportWorkload, OrderWorkload, TabletOption } from '@/back/services/cargaDeTrabajoService'
import {
  assignDailyReportAction,
  type AssignDailyReportState,
} from '@/app/actions/assign-daily-report'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CargaDeTrabajoPageProps {
  orders: OrderWorkload[]
  tablets: TabletOption[]
}

interface AssignTarget {
  reportId: number
  reportConsecutive: string
  orderConsecutive: string
  reportDate: Date
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function countPendingUnassigned(order: OrderWorkload): number {
  return order.dailyReports.filter(
    (r) => r.status === 'pending' && r.sessions.length === 0,
  ).length
}

// ─── Status badge config ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { dot: string; label: string; pill: string; text: string }> = {
  pending: {
    dot: 'bg-blue-400',
    label: 'Pendiente',
    pill: 'bg-blue-500/10 border border-blue-500/20',
    text: 'text-blue-400',
  },
  submitted: {
    dot: 'bg-blue-400',
    label: 'Enviado',
    pill: 'bg-blue-500/10 border border-blue-500/20',
    text: 'text-blue-400',
  },
  sampling: {
    dot: 'bg-violet-400',
    label: 'En muestreo',
    pill: 'bg-violet-500/10 border border-violet-500/20',
    text: 'text-violet-400',
  },
  signed: {
    dot: 'bg-slate-400',
    label: 'Firmado',
    pill: 'bg-slate-500/10 border border-slate-500/20',
    text: 'text-slate-400',
  },
  published: {
    dot: 'bg-green-400',
    label: 'Publicado',
    pill: 'bg-green-500/10 border border-green-500/20',
    text: 'text-green-400',
  },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.pill} ${cfg.text}`}
    >
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  )
}

function AssignSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {pending ? 'Asignando...' : 'Asignar'}
    </button>
  )
}

// ─── Assign Modal ─────────────────────────────────────────────────────────────

interface AssignModalProps {
  target: AssignTarget
  tablets: TabletOption[]
  state: AssignDailyReportState
  action: (formData: FormData) => void
  onClose: () => void
}

function AssignModal({ target, tablets, state, action, onClose }: AssignModalProps) {
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-assign-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      <form
        action={action}
        className="w-full max-w-md overflow-hidden rounded-xl border border-[#25395f] bg-[#111a30] text-slate-100 shadow-2xl"
      >
        <input type="hidden" name="dailyReportId" value={String(target.reportId)} />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#25395f] px-5 py-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 id="modal-assign-titulo" className="text-sm font-semibold text-white">
              Asignar tablet — {target.reportConsecutive}
            </h2>
            <p className="text-xs text-slate-400">
              {formatDate(target.reportDate)} · Orden: {target.orderConsecutive}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 flex-shrink-0 rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Cerrar modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-5 py-5">
          {/* Tablet select */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-300">Tablet</span>
            <select
              name="tabletId"
              required
              defaultValue=""
              className="rounded-md border border-[#31476f] bg-[#0c1426] px-3 py-2 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
            >
              <option value="" disabled>
                Selecciona una tablet
              </option>
              {tablets.map((tablet) => (
                <option key={tablet.id} value={String(tablet.id)}>
                  {tablet.alias}
                  {tablet.plantName ? ` (${tablet.plantName})` : ''}
                </option>
              ))}
            </select>
          </label>

          {/* Error message */}
          {state && !state.ok && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {state.error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[#25395f] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#31476f] px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            Cancelar
          </button>
          <AssignSubmitButton />
        </div>
      </form>
    </div>
  )
}

// ─── Session chip ─────────────────────────────────────────────────────────────

function SessionChip({ tabletAlias, shiftLabel, operadores }: { tabletAlias: string; shiftLabel?: string; operadores?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 dark:border-[#1a2d4d] dark:bg-[#070e1a] px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300">
      <TabletSmartphone size={11} className="flex-shrink-0 text-slate-500" aria-hidden="true" />
      <span className="font-medium">{tabletAlias}</span>
      {shiftLabel && (
        <>
          <span className="text-slate-500">·</span>
          <span>{shiftLabel}</span>
        </>
      )}
      {operadores && (
        <>
          <span className="text-slate-500">·</span>
          <span className="max-w-[120px] truncate text-slate-400">{operadores}</span>
        </>
      )}
    </span>
  )
}

// ─── Daily report row ─────────────────────────────────────────────────────────

interface DailyReportRowProps {
  report: DailyReportWorkload
  orderConsecutive: string
  onAssign: (target: AssignTarget) => void
}

function DailyReportRow({ report, orderConsecutive, onAssign }: DailyReportRowProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 dark:border-[#1a2d4d] px-5 py-3 last:border-b-0 hover:bg-slate-50 dark:hover:bg-[#070e1a]/50 transition-colors">
      {/* Left: date + consecutive + status */}
      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <Calendar size={12} className="flex-shrink-0" aria-hidden="true" />
          {formatDate(report.reportDate)}
        </span>
        <span className="font-mono text-xs font-medium text-slate-300">
          {report.consecutiveNumber}
        </span>
        <StatusBadge status={report.status} />
        {report.totalInspected > 0 && (
          <span className="text-xs text-slate-500">
            {report.totalInspected.toLocaleString('es-MX')} pzs
          </span>
        )}
      </div>

      {/* Right: sessions + assign button */}
      <div className="flex flex-wrap items-center gap-2">
        {report.sessions.map((session) => (
          <SessionChip
            key={session.id}
            tabletAlias={session.tabletAlias}
            shiftLabel={session.shiftLabel}
            operadores={session.operadores ?? undefined}
          />
        ))}

        {report.status === 'pending' && report.sessions.length === 0 && (
          <button
            type="button"
            onClick={() =>
              onAssign({
                reportId: report.id,
                reportConsecutive: report.consecutiveNumber,
                orderConsecutive,
                reportDate: report.reportDate,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 transition-colors hover:border-blue-400 hover:bg-blue-500/20"
          >
            <Plus size={12} aria-hidden="true" />
            Asignar tablet
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Order card ───────────────────────────────────────────────────────────────

interface OrderCardProps {
  order: OrderWorkload
  isExpanded: boolean
  onToggle: () => void
  onAssign: (target: AssignTarget) => void
}

function OrderCard({ order, isExpanded, onToggle, onAssign }: OrderCardProps) {
  const pendingCount = countPendingUnassigned(order)

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#1a2d4d] dark:bg-[#0c1829]">
      {/* Card header — always visible */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-start gap-3 p-5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-[#111a30]"
      >
        <Briefcase
          size={18}
          className="mt-0.5 flex-shrink-0 text-blue-400"
          aria-hidden="true"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
              {order.consecutiveNumber}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {order.clientName}
              <span className="mx-1.5 text-slate-600">·</span>
              {order.plantName}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            <span className="font-mono">{order.partNumber}</span>
            <span className="mx-1.5 text-slate-600">—</span>
            {order.partName}
          </p>
        </div>

        {/* Badges */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-100 dark:border-[#25395f] dark:bg-[#111a30] px-2 py-0.5 text-xs text-slate-500 dark:text-slate-400">
            {order.dailyReports.length} reporte{order.dailyReports.length !== 1 ? 's' : ''}
          </span>
          {pendingCount > 0 && (
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
              {pendingCount} sin asignar
            </span>
          )}
          {isExpanded ? (
            <ChevronDown size={15} className="text-slate-500" aria-hidden="true" />
          ) : (
            <ChevronRight size={15} className="text-slate-500" aria-hidden="true" />
          )}
        </div>
      </button>

      {/* Expanded body — daily reports */}
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-[#1a2d4d]">
          {order.dailyReports.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-500">
              Sin reportes diarios en esta orden.
            </p>
          ) : (
            order.dailyReports.map((report) => (
              <DailyReportRow
                key={report.id}
                report={report}
                orderConsecutive={order.consecutiveNumber}
                onAssign={onAssign}
              />
            ))
          )}
        </div>
      )}
    </article>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function CargaDeTrabajoPage({ orders, tablets }: CargaDeTrabajoPageProps) {
  const router = useRouter()
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set())
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null)
  const [assignState, assignAction] = useActionState(assignDailyReportAction, undefined)

  // Close modal and refresh on successful assignment
  useEffect(() => {
    if (assignState?.ok === true) {
      setAssignTarget(null)
      router.refresh()
    }
  }, [assignState, router])

  function toggleOrder(orderId: number) {
    setExpandedOrders((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }

  const totalPending = orders.reduce(
    (sum, order) => sum + countPendingUnassigned(order),
    0,
  )

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">

        {/* Page header */}
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Carga de trabajo</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {orders.length} {orders.length === 1 ? 'orden activa' : 'órdenes activas'}
            {totalPending > 0 && (
              <>
                <span className="mx-1.5 text-slate-600">·</span>
                <span className="text-blue-400">
                  {totalPending} {totalPending === 1 ? 'reporte pendiente' : 'reportes pendientes'} de asignación
                </span>
              </>
            )}
          </p>
        </div>

        {/* Orders list */}
        {orders.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white dark:border-[#1a2d4d] dark:bg-[#0c1829] py-16">
            <Briefcase size={32} className="text-slate-600" aria-hidden="true" />
            <p className="text-sm text-slate-500">Sin órdenes activas asignadas</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isExpanded={expandedOrders.has(order.id)}
                onToggle={() => toggleOrder(order.id)}
                onAssign={setAssignTarget}
              />
            ))}
          </div>
        )}
      </div>

      {/* Assign modal */}
      {assignTarget && (
        <AssignModal
          target={assignTarget}
          tablets={tablets}
          state={assignState}
          action={assignAction}
          onClose={() => setAssignTarget(null)}
        />
      )}
    </div>
  )
}
