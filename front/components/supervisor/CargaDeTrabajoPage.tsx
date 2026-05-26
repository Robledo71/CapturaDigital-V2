'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Briefcase, ChevronLeft, ChevronRight, FileSearch, Loader2, TabletSmartphone, X } from 'lucide-react'
import type {
  OrderWorkload,
  OrderItemWorkload,
  TabletOption,
} from '@/back/services/cargaDeTrabajoService'
import {
  assignOrderItemAction,
  type AssignOrderItemState,
} from '@/app/actions/assign-order-item'
import { SearchCotizacionModal } from './SearchCotizacionModal'

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

// ─── Types ────────────────────────────────────────────────────────────────────

interface CargaDeTrabajoPageProps {
  orders: OrderWorkload[]
  tablets: TabletOption[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countPendingUnassigned(order: OrderWorkload): number {
  return order.items.filter(
    (item) => item.status === 'pending' && item.assignedTablet === null,
  ).length
}

function formatMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount)
}

// ─── Status badge config ──────────────────────────────────────────────────────

const ITEM_STATUS_CONFIG: Record<string, { label: string; pill: string; dot: string; text: string }> = {
  pending: {
    label: 'Pendiente',
    pill: 'bg-blue-100 border border-blue-300 dark:bg-blue-500/10 dark:border-blue-500/20',
    dot: 'bg-blue-600 dark:bg-blue-400',
    text: 'text-blue-700 dark:text-blue-400',
  },
  assigned: {
    label: 'Asignado',
    pill: 'bg-violet-100 border border-violet-300 dark:bg-violet-500/10 dark:border-violet-500/20',
    dot: 'bg-violet-600 dark:bg-violet-400',
    text: 'text-violet-700 dark:text-violet-400',
  },
  in_progress: {
    label: 'En progreso',
    pill: 'bg-amber-100 border border-amber-300 dark:bg-amber-500/10 dark:border-amber-500/20',
    dot: 'bg-amber-600 dark:bg-amber-400',
    text: 'text-amber-700 dark:text-amber-400',
  },
  completed: {
    label: 'Completado',
    pill: 'bg-green-100 border border-green-300 dark:bg-green-500/10 dark:border-green-500/20',
    dot: 'bg-green-600 dark:bg-green-400',
    text: 'text-green-700 dark:text-green-400',
  },
}

const QUOTATION_STATUS_CONFIG: Record<string, { label: string; pill: string; text: string }> = {
  pendiente: {
    label: 'Pendiente',
    pill: 'bg-slate-100 border border-slate-300 dark:bg-slate-500/10 dark:border-slate-500/20',
    text: 'text-slate-600 dark:text-slate-400',
  },
  aprobada: {
    label: 'Aprobada',
    pill: 'bg-green-100 border border-green-300 dark:bg-green-500/10 dark:border-green-500/20',
    text: 'text-green-700 dark:text-green-400',
  },
  rechazada: {
    label: 'Rechazada',
    pill: 'bg-red-100 border border-red-300 dark:bg-red-500/10 dark:border-red-500/20',
    text: 'text-red-700 dark:text-red-400',
  },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ItemStatusBadge({ status }: { status: string }) {
  const cfg = ITEM_STATUS_CONFIG[status] ?? ITEM_STATUS_CONFIG.pending
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.pill} ${cfg.text}`}
    >
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  )
}

function QuotationStatusBadge({ status }: { status: string }) {
  const cfg = QUOTATION_STATUS_CONFIG[status] ?? QUOTATION_STATUS_CONFIG.pendiente
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.pill} ${cfg.text}`}
    >
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

// ─── Assign Item Modal ────────────────────────────────────────────────────────

interface AssignItemModalProps {
  orderItemId: number
  tablets: TabletOption[]
  state: AssignOrderItemState
  action: (formData: FormData) => void
  onClose: () => void
}

function AssignItemModal({ orderItemId, tablets, state, action, onClose }: AssignItemModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose()
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sub-modal-titulo"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <form
        action={action}
        className="w-full max-w-sm overflow-hidden rounded-xl border border-[#25395f] bg-[#111a30] shadow-2xl"
      >
        <input type="hidden" name="orderItemId" value={String(orderItemId)} />

        <div className="flex items-center justify-between border-b border-[#25395f] px-5 py-4">
          <h3 id="sub-modal-titulo" className="text-sm font-semibold text-white">
            Asignar tablet al item
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-5">
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
                  {tablet.codigoTablet}
                  {tablet.plantName ? ` (${tablet.plantName})` : ''}
                </option>
              ))}
            </select>
          </label>

          {state && !state.ok && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {state.error}
            </p>
          )}
        </div>

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

// ─── Order Item Row ───────────────────────────────────────────────────────────

interface OrderItemRowProps {
  item: OrderItemWorkload
  onAssign: (itemId: number) => void
}

function OrderItemRow({ item, onAssign }: OrderItemRowProps) {
  const canReassign =
    item.assignedTablet !== null && item.status !== 'in_progress'
  const canAssign = item.status === 'pending' && item.assignedTablet === null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1a2d4d] px-4 py-3 last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-mono text-xs font-medium text-slate-200">{item.partNumber}</span>
        <span className="text-xs text-slate-400">{item.partName}</span>
        {item.quotationConsecutive && (
          <span className="text-xs text-slate-500">
            Cotización: <span className="font-mono text-slate-400">{item.quotationConsecutive}</span>
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">
          {item.inventario.toLocaleString('es-MX')} pzs
        </span>

        <ItemStatusBadge status={item.status} />

        {item.assignedTablet ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300">
            <TabletSmartphone size={11} className="flex-shrink-0" aria-hidden="true" />
            {item.assignedTablet.alias}
          </span>
        ) : (
          <span className="text-xs text-slate-600">Sin asignar</span>
        )}

        {canAssign && (
          <button
            type="button"
            onClick={() => onAssign(item.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 transition-colors hover:border-blue-400 hover:bg-blue-500/20"
          >
            Asignar tablet
          </button>
        )}

        {canReassign && (
          <button
            type="button"
            onClick={() => onAssign(item.id)}
            className="inline-flex items-center rounded-lg border border-slate-500/30 px-2.5 py-1 text-xs text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-300"
          >
            Reasignar
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Order Detail Modal ───────────────────────────────────────────────────────

interface OrderDetailModalProps {
  order: OrderWorkload
  tablets: TabletOption[]
  onClose: () => void
}

function OrderDetailModal({ order, tablets, onClose }: OrderDetailModalProps) {
  const router = useRouter()
  const overlayRef = useRef<HTMLDivElement>(null)
  const [assignItemId, setAssignItemId] = useState<number | null>(null)
  const [assignState, assignAction] = useActionState(assignOrderItemAction, undefined)

  useEffect(() => {
    if (assignState?.ok === true) {
      setAssignItemId(null)
      router.refresh()
    }
  }, [assignState, router])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && assignItemId === null) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, assignItemId])

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current && assignItemId === null) onClose()
  }

  return (
    <>
      <div
        ref={overlayRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-modal-titulo"
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-8 backdrop-blur-sm"
        onClick={handleOverlayClick}
      >
        <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-[#25395f] bg-[#0c1829] shadow-2xl">

          {/* Header */}
          <div className="flex items-start justify-between border-b border-[#1a2d4d] px-6 py-5">
            <div className="flex flex-col gap-1">
              <h2 id="order-modal-titulo" className="font-mono text-lg font-bold text-white">
                {order.consecutiveNumber}
              </h2>
              <p className="text-sm text-slate-400">
                {order.clientName}
                <span className="mx-1.5 text-slate-600">·</span>
                {order.plantName}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-4 flex-shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Cerrar modal"
            >
              <X size={17} />
            </button>
          </div>

          <div className="flex flex-col gap-0 divide-y divide-[#1a2d4d]">

            {/* Sección 1 — Datos de la orden */}
            <section className="px-6 py-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Datos de la orden
              </h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <dt className="text-xs text-slate-500">No. de parte</dt>
                  <dd className="font-mono text-sm text-slate-200">{order.partNumber}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Nombre de parte</dt>
                  <dd className="text-sm text-slate-200">{order.partName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Tipo de servicio</dt>
                  <dd className="text-sm text-slate-200">{order.serviceType}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Estado</dt>
                  <dd className="text-sm text-slate-200 capitalize">{order.orderStatus}</dd>
                </div>
              </dl>
            </section>

            {/* Sección 2 — Cotizaciones */}
            <section className="px-6 py-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Cotizaciones
              </h3>
              {order.quotations.length === 0 ? (
                <p className="text-sm text-slate-600">Sin cotizaciones</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {order.quotations.map((q) => (
                    <li
                      key={q.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[#1a2d4d] bg-[#0a1628] px-3 py-2.5"
                    >
                      <span className="font-mono text-sm font-medium text-slate-200">
                        {q.consecutiveNumber}
                      </span>
                      <div className="flex items-center gap-3">
                        <QuotationStatusBadge status={q.status ?? ''} />
                        <span className="text-sm text-slate-300">{formatMXN(q.total)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Sección 3 — Items de trabajo */}
            <section className="px-6 py-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Items de trabajo
                <span className="ml-2 font-normal normal-case text-slate-600">
                  ({order.items.length})
                </span>
              </h3>
              {order.items.length === 0 ? (
                <p className="text-sm text-slate-600">Sin items registrados</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-[#1a2d4d] bg-[#0a1628]">
                  {order.items.map((item) => (
                    <OrderItemRow
                      key={item.id}
                      item={item}
                      onAssign={setAssignItemId}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {assignItemId !== null && (
        <AssignItemModal
          orderItemId={assignItemId}
          tablets={tablets}
          state={assignState}
          action={assignAction}
          onClose={() => setAssignItemId(null)}
        />
      )}
    </>
  )
}

// ─── Orders Table ─────────────────────────────────────────────────────────────

interface OrdersTableProps {
  orders: OrderWorkload[]
  onRowClick: (order: OrderWorkload) => void
}

function OrdersTable({ orders, onRowClick }: OrdersTableProps) {
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [orders])

  const totalPages = Math.ceil(orders.length / PAGE_SIZE)
  const paged = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const from = orders.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, orders.length)

  function getPageNumbers(): (number | '…')[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const pages: (number | '…')[] = [1]
    if (page > 3) pages.push('…')
    const start = Math.max(2, page - 1)
    const end = Math.min(totalPages - 1, page + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (page < totalPages - 2) pages.push('…')
    pages.push(totalPages)
    return pages
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-[#1a2d4d] dark:bg-[#0c1829] dark:shadow-none">
      <table className="w-full table-auto text-sm">
        <thead>
          <tr className="border-b border-blue-200 dark:border-[#1a2d4d] dark:bg-[#0a1628]">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Consecutivo
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cliente
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Planta
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              No. Parte
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
              Items
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sin asignar
            </th>
          </tr>
        </thead>
        <tbody>
          {paged.map((order) => {
            const pending = countPendingUnassigned(order)
            return (
              <tr
                key={order.id}
                onClick={() => onRowClick(order)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onRowClick(order)
                  }
                }}
                className="cursor-pointer border-b border-blue-200 transition-colors last:border-b-0 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:border-[#1a2d4d] dark:hover:bg-[#111a30]"
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                    {order.consecutiveNumber}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{order.clientName}</td>
                <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{order.plantName}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{order.partNumber}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-[#25395f] bg-[#111a30] px-2 text-xs text-slate-400">
                    {order.items.length}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {pending > 0 ? (
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 px-2 text-xs font-medium text-blue-400">
                      {pending}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-700">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1 pt-3 pb-4 px-4">
          <span className="text-xs text-slate-500">
            Mostrando {from}–{to} de {orders.length} órdenes
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Página anterior"
              className="rounded-md px-2.5 py-1 text-xs text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:text-white"
            >
              <ChevronLeft size={14} />
            </button>

            {getPageNumbers().map((p, idx) =>
              p === '…' ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1 text-xs text-slate-400 dark:text-slate-500"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  aria-label={`Página ${p}`}
                  aria-current={page === p ? 'page' : undefined}
                  className={
                    page === p
                      ? 'rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white'
                      : 'rounded-md px-2.5 py-1 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }
                >
                  {p}
                </button>
              ),
            )}

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Página siguiente"
              className="rounded-md px-2.5 py-1 text-xs text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:text-white"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function CargaDeTrabajoPage({ orders, tablets }: CargaDeTrabajoPageProps) {
  const router = useRouter()
  const [selectedOrder, setSelectedOrder] = useState<OrderWorkload | null>(null)
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false })

  useEffect(() => {
    if (!toast.visible) return
    const t = setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 4000)
    return () => clearTimeout(t)
  }, [toast.visible])

  const totalPending = orders.reduce(
    (sum, order) => sum + countPendingUnassigned(order),
    0,
  )

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Carga de trabajo</h1>
            <p className="mt-0.5 text-sm text-slate-400">
              {orders.length} {orders.length === 1 ? 'orden activa' : 'órdenes activas'}
              {totalPending > 0 && (
                <>
                  <span className="mx-1.5 text-slate-600">·</span>
                  <span className="text-blue-400">
                    {totalPending} {totalPending === 1 ? 'item pendiente' : 'items pendientes'} de asignación
                  </span>
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSearchModalOpen(true)}
            className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            <FileSearch size={15} aria-hidden="true" />
            Buscar cotización
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-[#1a2d4d] bg-[#0c1829] py-16">
            <Briefcase size={32} className="text-slate-600" aria-hidden="true" />
            <p className="text-sm text-slate-500">Sin órdenes activas asignadas</p>
          </div>
        ) : (
          <OrdersTable orders={orders} onRowClick={setSelectedOrder} />
        )}
      </div>

      {selectedOrder !== null && (
        <OrderDetailModal
          order={selectedOrder}
          tablets={tablets}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {searchModalOpen && (
        <SearchCotizacionModal
          onClose={() => setSearchModalOpen(false)}
          onSuccess={({ cotizaciones, items, orden }) => {
            setSearchModalOpen(false)
            setToast({
              message: `Orden ${orden}: ${cotizaciones} cotización${cotizaciones !== 1 ? 'es' : ''}, ${items} item${items !== 1 ? 's' : ''} importado${items !== 1 ? 's' : ''}`,
              visible: true,
            })
            router.refresh()
          }}
        />
      )}

      {toast.visible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-green-500/30 bg-white px-5 py-3.5 shadow-2xl dark:bg-[#0c1829]"
        >
          <span className="h-2 w-2 flex-shrink-0 rounded-full bg-green-400" aria-hidden="true" />
          <p className="text-sm text-slate-700 dark:text-slate-200">{toast.message}</p>
        </div>
      )}
    </div>
  )
}
