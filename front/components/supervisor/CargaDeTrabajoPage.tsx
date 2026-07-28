'use client'

import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Briefcase, CheckCircle2, ChevronLeft, ChevronRight, Download, Eye, FileCheck, FileSearch, Loader2, Search, UserCheck, UserPlus, Upload, X } from 'lucide-react'
import { getOrderInventory, isIndefiniteInventoryPlant } from '@/front/lib/inventory'
import type {
  OrderWorkload,
  OrderItemWorkload,
  InspectorOption,
} from '@/back/services/cargaDeTrabajoService'
import {
  assignOrderItemAction,
  type AssignOrderItemState,
} from '@/app/actions/assign-order-item'
import {
  desasignarInspectorAction,
  type DesasignarInspectorState,
} from '@/app/actions/desasignar-inspector'
import { uploadOrderDocumentAction } from '@/app/actions/upload-order-document'
import { SearchCotizacionModal } from './SearchCotizacionModal'
import { can, type SessionLike } from '@/front/lib/permisos'

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

// ─── Types ────────────────────────────────────────────────────────────────────

interface CargaDeTrabajoPageProps {
  orders: OrderWorkload[]
  inspectors: InspectorOption[]
  rol: string
  permisos?: string[] | null
}

/** Identifies a specific item+doc combination that is currently uploading. */
interface UploadTarget {
  itemId: number
  docType: 'hoe' | 'arranque-seguro'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countPendingUnassigned(order: OrderWorkload): number {
  return order.items.filter(
    (item) => item.status === 'pending' && item.assignedInspectors.length === 0,
  ).length
}

/**
 * true cuando el item aún tiene inventario pendiente por completar. Se conserva
 * como utilidad pura (probada en tests); ya no hay flujo de "liberar" en la UI
 * (no existe endpoint de liberación en el backend v2.0).
 */
export function isInventarioPendiente(
  item: Pick<OrderItemWorkload, 'inventario' | 'inventarioTerminado'>,
  indefinite: boolean,
): boolean {
  return !indefinite && item.inventario > 0 && item.inventarioTerminado < item.inventario
}

/**
 * true cuando el inventario del item ya está terminado y por lo tanto NO se puede
 * asignar un inspector (regla de negocio validada también por el backend, que
 * responde 409 en ese caso). Plantas de inventario indefinido nunca se consideran terminadas.
 */
export function isInventarioCompleto(
  item: Pick<OrderItemWorkload, 'inventario' | 'inventarioTerminado'>,
  indefinite: boolean,
): boolean {
  return !indefinite && item.inventario > 0 && item.inventarioTerminado >= item.inventario
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
    dot: 'bg-amber-600 dark:bg-amber-400 animate-pulse-dot',
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

function AssignSubmitButton({ disabled = false }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {pending ? 'Asignando...' : 'Asignar'}
    </button>
  )
}

// ─── Inspector Chip (removable) ───────────────────────────────────────────────
// Shown per-assigned-inspector when the user can asignar/desasignar — each chip
// carries its own × so a single inspector's session can be closed without
// touching the others still working the item.

interface InspectorChipProps {
  inspector: { id: number; name: string }
  onRemove: () => void
  disabled?: boolean
}

function InspectorChip({ inspector, onRemove, disabled = false }: InspectorChipProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 py-1 pl-2.5 pr-1 text-xs font-medium text-violet-300">
      <UserCheck size={11} className="flex-shrink-0" aria-hidden="true" />
      {inspector.name}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Desasignar a ${inspector.name}`}
        className="ml-0.5 flex-shrink-0 rounded-full p-0.5 text-violet-400 transition-colors hover:bg-violet-500/20 hover:text-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <X size={10} aria-hidden="true" />
      </button>
    </span>
  )
}

// ─── Desasignar Confirm Modal ─────────────────────────────────────────────────
// Lightweight confirm dialog before closing an inspector's session — mirrors the
// styling of AssignItemModal (same card chrome, header, footer button row).

function DesasignarSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {pending ? 'Desasignando...' : 'Desasignar'}
    </button>
  )
}

interface DesasignarConfirmModalProps {
  orderItemId: number
  inspector: { id: number; name: string }
  state: DesasignarInspectorState
  action: (formData: FormData) => void
  onClose: () => void
}

function DesasignarConfirmModal({ orderItemId, inspector, state, action, onClose }: DesasignarConfirmModalProps) {
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
      aria-labelledby="desasignar-modal-titulo"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm animate-fade-in"
      onClick={handleOverlayClick}
    >
      <form
        action={action}
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white dark:border-[#25395f] dark:bg-[#111a30] shadow-2xl animate-scale-in"
      >
        <input type="hidden" name="orderItemId" value={String(orderItemId)} />
        <input type="hidden" name="empleadoId" value={String(inspector.id)} />

        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#25395f] px-5 py-4">
          <h3 id="desasignar-modal-titulo" className="text-sm font-semibold text-slate-900 dark:text-white">
            Desasignar inspector
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white"
            aria-label="Cerrar"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-5 py-5">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            ¿Desasignar a <span className="font-medium text-slate-900 dark:text-white">{inspector.name}</span> de
            este trabajo? Su sesión de inspección se cerrará.
          </p>

          {state && !state.ok && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {state.error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-[#25395f] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 dark:border-[#31476f] px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            Cancelar
          </button>
          <DesasignarSubmitButton />
        </div>
      </form>
    </div>
  )
}

// ─── Document Chip ────────────────────────────────────────────────────────────

interface DocChipProps {
  label: string
  isUploaded: boolean
  isUploading: boolean
  disabled: boolean
  onClick: () => void
  /** Cuando el documento está cargado, abre el modal visor del PDF. */
  onView?: () => void
}

function DocChip({ label, isUploaded, isUploading, disabled, onClick, onView }: DocChipProps) {
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        aria-label={isUploaded ? `Reemplazar ${label}` : `Agregar ${label}`}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          isUploaded
            ? 'border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20'
            : 'border-slate-600/50 bg-transparent text-slate-400 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400'
        }`}
      >
        {isUploading ? (
          <Loader2 size={11} className="animate-spin flex-shrink-0" aria-hidden="true" />
        ) : isUploaded ? (
          <FileCheck size={11} className="flex-shrink-0" aria-hidden="true" />
        ) : (
          <Upload size={11} className="flex-shrink-0" aria-hidden="true" />
        )}
        {isUploading ? 'Subiendo…' : isUploaded ? `${label} ✓` : `${label}`}
      </button>

      {isUploaded && !isUploading && onView && (
        <button
          type="button"
          onClick={onView}
          aria-label={`Ver ${label}`}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-600/50 px-1.5 py-1 text-xs text-slate-500 dark:text-slate-400 transition-colors hover:border-blue-500/50 hover:text-blue-500 dark:hover:text-blue-400"
        >
          <Eye size={11} className="flex-shrink-0" aria-hidden="true" />
          ver
        </button>
      )}
    </span>
  )
}

// ─── Document Viewer Modal ────────────────────────────────────────────────────
// Embeds the PDF (served inline by the proxy) in an iframe so el documento se ve
// dentro de la app sin descargarse. Incluye opción de descargar.

interface DocViewerModalProps {
  href: string
  title: string
  onClose: () => void
}

function DocViewerModal({ href, title, onClose }: DocViewerModalProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex flex-col bg-black/70 p-2 backdrop-blur-sm animate-fade-in sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-[#25395f] dark:bg-[#0c1829] animate-scale-in">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 dark:border-[#1a2d4d] px-4 py-3">
          <h3 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={href}
              download
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-100 dark:border-[#31476f] dark:text-slate-300 dark:hover:bg-white/10"
            >
              <Download size={13} aria-hidden="true" />
              <span className="hidden sm:inline">Descargar</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X size={17} />
            </button>
          </div>
        </div>
        {/* PDF embebido */}
        <iframe src={href} title={title} className="h-full w-full flex-1 bg-white" />
      </div>
    </div>
  )
}

// ─── Assign Item Modal ────────────────────────────────────────────────────────

interface AssignItemModalProps {
  /** DB id of the OrderItem, or 0 if the item is not yet persisted (came from QB search). */
  orderItemId: number
  /** Full item data — needed to embed hidden QB fields (order/quotation/item tree). */
  item: OrderItemWorkload
  /** Parent order — needed to embed hidden QB order/quotation fields. */
  order: OrderWorkload
  /** All inspectors (rol=inspector); filtered here by the order's plant. */
  inspectors: InspectorOption[]
  /** empleado_id of inspectors that already have an assignment on ANY item in the current workload. */
  busyInspectorIds: Set<number>
  state: AssignOrderItemState
  action: (formData: FormData) => void
  onClose: () => void
}

function AssignItemModal({ orderItemId, item, order, inspectors, busyInspectorIds, state, action, onClose }: AssignItemModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // Which quotation this item belongs to, from the parent order's quotation list.
  const parentQuotation = order.quotations.find(
    (q) => q.consecutiveNumber === item.quotationConsecutive
  ) ?? order.quotations[0]

  // Build the list of OTHER items (all items in the order except the one being assigned)
  // so qb_sync can persist/keep the full order tree on every upsert.
  // Identity is determined by reference — `item` is the exact object from `order.items`.
  const otherItemsJson: string | null = (() => {
    const others = order.items
      .filter((i) => i !== item)
      .map((i) => {
        const q = order.quotations.find((q) => q.consecutiveNumber === i.quotationConsecutive)
        return {
          quotation: {
            consecutive_number: i.quotationConsecutive ?? '',
            client_email: q?.clientEmail ?? null,
            status: q?.status ?? null,
            purchase_order_number: q?.purchaseOrderNumber ?? null,
            contact_emails: q?.contactEmails ?? null,
            order_user_name: q?.orderUserName ?? null,
          },
          orderItem: {
            part_number: i.partNumber === '—' ? null : i.partNumber,
            part_name: i.partName === '—' ? '' : i.partName,
            inventory: i.inventario,
            inventory_done: i.inventarioTerminado,
            plant_name: order.plantName ?? '',
          },
        }
      })
    return others.length > 0 ? JSON.stringify(others) : null
  })()

  // Only inspectors assigned to the item's plant (an inspector may have several
  // plants) — fall back to showing all when the order has no known plantId
  // (e.g. a brand-new QB-search order not yet persisted).
  const relevantInspectors = useMemo(
    () => (order.plantId != null ? inspectors.filter((i) => i.plantIds.includes(order.plantId!)) : inspectors),
    [inspectors, order.plantId],
  )

  function toggleInspector(empleadoId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(empleadoId)) next.delete(empleadoId)
      else next.add(empleadoId)
      return next
    })
  }

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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm animate-fade-in"
      onClick={handleOverlayClick}
    >
      <form
        action={action}
        className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-[#25395f] dark:bg-[#111a30] shadow-2xl animate-scale-in"
      >
        <input type="hidden" name="orderItemId" value={String(orderItemId)} />

        {/* Every assignment upserts the full Order → Quotation → OrderItem tree,
            whether the item is new (id===0) or already persisted. */}
        {otherItemsJson !== null && (
          <input type="hidden" name="otherItems" value={otherItemsJson} />
        )}

        {/* Order fields */}
        <input type="hidden" name="qb_order_consecutive" value={order.consecutiveNumber ?? ''} />
        <input type="hidden" name="qb_order_state" value={order.orderStatus ?? ''} />
        <input type="hidden" name="qb_order_client_name" value={order.clientName ?? ''} />
        <input type="hidden" name="qb_order_client_contact_name" value={order.clientContactName ?? ''} />
        <input type="hidden" name="qb_order_client_contact_email" value={order.clientContactEmail ?? ''} />
        <input type="hidden" name="qb_order_service_type_name" value={order.serviceType ?? ''} />
        <input type="hidden" name="qb_order_region_name" value={order.regionName ?? ''} />
        <input type="hidden" name="qb_order_service_type_detail" value={order.serviceTypeDetail ?? ''} />
        <input type="hidden" name="qb_order_pieces_per_hour" value={order.piecesPerHour !== null && order.piecesPerHour !== undefined ? String(order.piecesPerHour) : ''} />
        <input type="hidden" name="qb_order_authorized_hours" value={order.authorizedHours !== null && order.authorizedHours !== undefined ? String(order.authorizedHours) : ''} />
        <input type="hidden" name="qb_order_price_per_hour" value={order.pricePerHour !== null && order.pricePerHour !== undefined ? String(order.pricePerHour) : ''} />
        <input type="hidden" name="qb_order_language" value={order.language ?? ''} />
        <input type="hidden" name="qb_order_user_name" value={order.userName ?? ''} />
        <input type="hidden" name="qb_order_plant_name" value={order.plantName ?? ''} />
        {/* Quotation fields */}
        <input type="hidden" name="qb_quotation_consecutive" value={item.quotationConsecutive ?? ''} />
        <input type="hidden" name="qb_quotation_client_email" value={parentQuotation?.clientEmail ?? ''} />
        <input type="hidden" name="qb_quotation_purchase_order_number" value={parentQuotation?.purchaseOrderNumber ?? ''} />
        <input type="hidden" name="qb_quotation_contact_emails" value={parentQuotation?.contactEmails ?? ''} />
        <input type="hidden" name="qb_quotation_order_user_name" value={parentQuotation?.orderUserName ?? ''} />
        <input type="hidden" name="qb_quotation_status" value={parentQuotation?.status ?? ''} />
        {/* OrderItem fields */}
        <input type="hidden" name="qb_item_part_number" value={item.partNumber === '—' ? '' : item.partNumber} />
        <input type="hidden" name="qb_item_part_name" value={item.partName === '—' ? '' : item.partName} />
        <input type="hidden" name="qb_item_inventory" value={String(item.inventario)} />
        <input type="hidden" name="qb_item_inventory_done" value={String(item.inventarioTerminado)} />
        <input type="hidden" name="qb_item_plant_name" value={order.plantName ?? ''} />
        <input type="hidden" name="qb_item_incidents" value="" />

        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#25395f] px-5 py-4">
          <h3 id="sub-modal-titulo" className="text-sm font-semibold text-slate-900 dark:text-white">
            Asignar inspector(es) al item
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white"
            aria-label="Cerrar"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-5">
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
              Inspectores
            </legend>

            {relevantInspectors.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No hay inspectores disponibles para esta planta.
              </p>
            ) : (
              <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-md border border-slate-200 dark:border-[#31476f] p-1.5">
                {relevantInspectors.map((inspector) => {
                  const isBusy = busyInspectorIds.has(inspector.empleadoId)
                  const isChecked = selectedIds.has(inspector.empleadoId)
                  return (
                    <label
                      key={inspector.empleadoId}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                        isBusy
                          ? 'cursor-not-allowed text-slate-400 dark:text-slate-500'
                          : 'cursor-pointer text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="inspectorIds"
                        value={String(inspector.empleadoId)}
                        checked={isChecked}
                        disabled={isBusy}
                        onChange={() => toggleInspector(inspector.empleadoId)}
                        className="h-4 w-4 flex-shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500/40 disabled:cursor-not-allowed"
                      />
                      <span className="flex-1 truncate">{inspector.name}</span>
                      {isBusy && (
                        <span className="flex-shrink-0 text-[10px] uppercase tracking-wide text-amber-500">
                          ocupado
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            )}
          </fieldset>

          {state && !state.ok && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {state.error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-[#25395f] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 dark:border-[#31476f] px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            Cancelar
          </button>
          <AssignSubmitButton disabled={selectedIds.size === 0} />
        </div>
      </form>
    </div>
  )
}

// ─── Order Item Card ──────────────────────────────────────────────────────────
// Redesigned layout — four rows, breathing room, doc chips at the bottom.

interface OrderItemCardProps {
  item: OrderItemWorkload
  /** Called with the full item object so the assign modal can embed QB hidden fields. */
  onAssign: (item: OrderItemWorkload) => void
  /** Opens the desasignar confirm modal for one specific assigned inspector. */
  onDesasignar: (item: OrderItemWorkload, inspector: { id: number; name: string }) => void
  /** true cuando la planta no maneja inventario — muestra "Indefinido" en lugar de la cantidad. */
  indefinite?: boolean
  canAsignar: boolean
  canDocumentos: boolean
  uploadingTarget: UploadTarget | null
  onUploadDoc: (item: OrderItemWorkload, docType: 'hoe' | 'arranque-seguro') => void
  onViewDoc: (item: OrderItemWorkload, docType: 'hoe' | 'arranque-seguro') => void
  uploadError: { itemId: number; error: string } | null
}

function OrderItemCard({
  item,
  onAssign,
  onDesasignar,
  canAsignar,
  indefinite = false,
  canDocumentos,
  uploadingTarget,
  onUploadDoc,
  onViewDoc,
  uploadError,
}: OrderItemCardProps) {
  const canAssign =
    item.assignedInspectors.length === 0 &&
    !item.hasSubmittedReport &&
    (item.status === 'pending' || item.status === 'completed')
  // Regla de negocio: no se puede asignar un inspector si el inventario del item ya
  // está terminado (el backend responde 409 en ese caso). Indefinido nunca bloquea.
  const inventarioCompleto = isInventarioCompleto(item, indefinite)
  const assignBlocked = canAssign && inventarioCompleto

  // Document chips are only shown for persisted items (id !== 0)
  const showDocs = canDocumentos && item.id !== 0
  const hoeUploading = uploadingTarget?.itemId === item.id && uploadingTarget?.docType === 'hoe'
  const arranqueUploading = uploadingTarget?.itemId === item.id && uploadingTarget?.docType === 'arranque-seguro'
  const anyUploading = uploadingTarget !== null
  const thisItemError = uploadError?.itemId === item.id ? uploadError.error : null

  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-[#1a2d4d] px-4 py-4 last:border-b-0">

      {/* Row 1 — part number + part name */}
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
          {item.partNumber}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{item.partName}</span>
      </div>

      {/* Row 2 — cotización + inventory */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        {item.quotationConsecutive && (
          <span>
            Cotización:{' '}
            <span className="font-mono text-slate-400 dark:text-slate-300">{item.quotationConsecutive}</span>
          </span>
        )}
        <span>
          {indefinite ? (
            <span className="italic text-slate-400">Indefinido</span>
          ) : (
            <>{item.inventario.toLocaleString('es-MX')} pzs</>
          )}
        </span>
      </div>

      {/* Row 3 — status badge + inspector chips + assign button (right-anchored) */}
      <div className="flex flex-wrap items-center gap-2">
        <ItemStatusBadge status={item.status} />

        {item.assignedInspectors.length > 0 ? (
          canAsignar ? (
            // Con permiso de asignar, cada inspector se muestra en su propio chip
            // (sin colapsar a "+N") para que el botón × individual siempre sea
            // alcanzable — evita tener que abrir otra vista para desasignar.
            <div className="flex flex-wrap items-center gap-1.5">
              {item.assignedInspectors.map((inspector) => (
                <InspectorChip
                  key={inspector.id}
                  inspector={inspector}
                  onRemove={() => onDesasignar(item, inspector)}
                />
              ))}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300">
              <UserCheck size={11} className="flex-shrink-0" aria-hidden="true" />
              {item.assignedInspectors.slice(0, 2).map((i) => i.name).join(', ')}
              {item.assignedInspectors.length > 2 && ` +${item.assignedInspectors.length - 2}`}
            </span>
          )
        ) : (
          <span className="text-xs text-slate-600 dark:text-slate-500">Sin asignar</span>
        )}

        {item.hasSubmittedReport && item.status !== 'completed' && (
          <span className="text-xs text-amber-500">Reporte enviado</span>
        )}

        {/* Assign button — pushed to the far right */}
        {canAsignar && canAssign && (
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              disabled={inventarioCompleto}
              onClick={() => onAssign(item)}
              title={
                inventarioCompleto
                  ? `No se puede asignar: el inventario ya está terminado (${item.inventarioTerminado.toLocaleString('es-MX')}/${item.inventario.toLocaleString('es-MX')} pzs)`
                  : undefined
              }
              className={
                inventarioCompleto
                  ? 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600/40 px-2.5 py-1 text-xs text-slate-400 dark:text-slate-500 opacity-50 cursor-not-allowed'
                  : 'inline-flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 transition-colors hover:border-blue-400 hover:bg-blue-500/20'
              }
            >
              <UserPlus size={12} className="flex-shrink-0" aria-hidden="true" />
              Asignar inspector
            </button>
          </div>
        )}
      </div>

      {/* Row 3c — aviso de inventario terminado cuando bloquea la asignación */}
      {canAsignar && assignBlocked && (
        <p className="-mt-1 text-[11px] text-amber-600 dark:text-amber-400">
          Inventario terminado ({item.inventarioTerminado.toLocaleString('es-MX')}/{item.inventario.toLocaleString('es-MX')} pzs) — no se puede asignar
        </p>
      )}

      {/* Row 4 — document chips only */}
      {showDocs && (
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-[#1a2d4d]">
          <DocChip
            label="HOE"
            isUploaded={!!item.hoe}
            isUploading={hoeUploading}
            disabled={anyUploading}
            onClick={() => onUploadDoc(item, 'hoe')}
            onView={() => onViewDoc(item, 'hoe')}
          />
          <DocChip
            label="Arranque"
            isUploaded={!!item.arranqueSeguro}
            isUploading={arranqueUploading}
            disabled={anyUploading}
            onClick={() => onUploadDoc(item, 'arranque-seguro')}
            onView={() => onViewDoc(item, 'arranque-seguro')}
          />
        </div>
      )}

      {/* Per-item upload error */}
      {thisItemError && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-300">
          {thisItemError}
        </p>
      )}
    </div>
  )
}

// ─── Order Detail Modal ───────────────────────────────────────────────────────

interface OrderDetailModalProps {
  order: OrderWorkload
  inspectors: InspectorOption[]
  busyInspectorIds: Set<number>
  onClose: () => void
  canAsignar: boolean
  canDocumentos: boolean
}

function OrderDetailModal({ order, inspectors, busyInspectorIds, onClose, canAsignar, canDocumentos }: OrderDetailModalProps) {
  const router = useRouter()
  const overlayRef = useRef<HTMLDivElement>(null)
  // Store the full item object so AssignItemModal can embed QB hidden fields when item.id === 0
  const [assignItem, setAssignItem] = useState<OrderItemWorkload | null>(null)
  const [assignState, assignAction] = useActionState(assignOrderItemAction, undefined)
  const [uploadState, uploadAction] = useActionState(uploadOrderDocumentAction, undefined)

  // Target inspector (+ item) for the desasignar confirm modal.
  const [desasignarTarget, setDesasignarTarget] = useState<{
    item: OrderItemWorkload
    inspector: { id: number; name: string }
  } | null>(null)
  const [desasignarState, desasignarAction] = useActionState(desasignarInspectorAction, undefined)

  // Single hidden file input; the pending target tells us which item+doc it's for.
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingUploadRef = useRef<{ item: OrderItemWorkload; docType: 'hoe' | 'arranque-seguro' } | null>(null)

  // Per-item upload tracking (replaces single uploadingDocType)
  const [uploadingTarget, setUploadingTarget] = useState<UploadTarget | null>(null)
  const [uploadError, setUploadError] = useState<{ itemId: number; error: string } | null>(null)

  // Document viewer modal (embeds the PDF served by the proxy)
  const [viewDoc, setViewDoc] = useState<{ href: string; title: string } | null>(null)

  function handleViewDoc(item: OrderItemWorkload, docType: 'hoe' | 'arranque-seguro') {
    const label = docType === 'hoe' ? 'HOE' : 'Arranque Seguro'
    setViewDoc({
      href: `/api/order-items/${item.id}/documents/${docType}`,
      title: `${label} · ${item.partNumber}`,
    })
  }

  // React to upload action result
  useEffect(() => {
    if (uploadState === undefined) return
    setUploadingTarget(null)
    if (fileInputRef.current) fileInputRef.current.value = ''

    if (uploadState.ok) {
      setUploadError(null)
      router.refresh()
    } else {
      // Surface error near the relevant item
      const targetItemId = pendingUploadRef.current?.item.id ?? null
      if (targetItemId !== null) {
        setUploadError({ itemId: targetItemId, error: uploadState.error })
      }
    }
  }, [uploadState, router])

  function handleUploadDoc(item: OrderItemWorkload, docType: 'hoe' | 'arranque-seguro') {
    pendingUploadRef.current = { item, docType }
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const pending = pendingUploadRef.current
    if (!file || !pending) return

    const fd = new FormData()
    fd.set('orderItemId', String(pending.item.id))
    fd.set('docType', pending.docType)
    fd.set('file', file)

    startTransition(() => {
      setUploadingTarget({ itemId: pending.item.id, docType: pending.docType })
      setUploadError(null)
      uploadAction(fd)
    })
  }

  useEffect(() => {
    if (assignState?.ok === true) {
      setAssignItem(null)
      router.refresh()
    }
  }, [assignState, router])

  useEffect(() => {
    if (desasignarState?.ok === true) {
      setDesasignarTarget(null)
      router.refresh()
    }
  }, [desasignarState, router])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && assignItem === null && viewDoc === null && desasignarTarget === null) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, assignItem, viewDoc, desasignarTarget])

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current && assignItem === null && viewDoc === null && desasignarTarget === null) onClose()
  }

  return (
    <>
      <div
        ref={overlayRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-modal-titulo"
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 px-3 py-4 sm:px-4 sm:py-8 backdrop-blur-sm animate-fade-in"
        onClick={handleOverlayClick}
      >
        <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#25395f] dark:bg-[#0c1829] shadow-2xl animate-scale-in sm:max-h-[90vh]">

          {/* Header */}
          <div className="flex shrink-0 items-start justify-between border-b border-slate-200 dark:border-[#1a2d4d] px-4 py-3.5 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-1">
              <h2 id="order-modal-titulo" className="font-mono text-lg font-bold text-slate-900 dark:text-white">
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
              className="ml-4 flex-shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white"
              aria-label="Cerrar modal"
            >
              <X size={17} />
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-0 divide-y divide-slate-200 overflow-y-auto scrollbar-thin dark:divide-[#1a2d4d]">

            {/* Sección 1 — Datos de la orden */}
            <section className="px-4 py-4 sm:px-6 sm:py-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Datos de la orden
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <dt className="text-xs text-slate-500">No. de parte</dt>
                  <dd className="font-mono text-sm text-slate-800 dark:text-slate-200">{order.partNumber}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Nombre de parte</dt>
                  <dd className="text-sm text-slate-800 dark:text-slate-200">{order.partName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Tipo de servicio</dt>
                  <dd className="text-sm text-slate-800 dark:text-slate-200">{order.serviceType}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Estado</dt>
                  <dd className="text-sm text-slate-800 dark:text-slate-200 capitalize">{order.orderStatus}</dd>
                </div>
              </dl>
            </section>

            {/* Sección 2 — Cotizaciones */}
            <section className="px-4 py-4 sm:px-6 sm:py-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Cotizaciones
              </h3>
              {order.quotations.length === 0 ? (
                <p className="text-sm text-slate-600">Sin cotizaciones</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {order.quotations.map((q, idx) => (
                    <li
                      key={q.consecutiveNumber ?? `q-${idx}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 dark:border-[#1a2d4d] dark:bg-[#0a1628] px-3 py-2.5"
                    >
                      <span className="font-mono text-sm font-medium text-slate-800 dark:text-slate-200">
                        {q.consecutiveNumber}
                      </span>
                      <div className="flex items-center gap-3">
                        <QuotationStatusBadge status={q.status ?? ''} />
                        <span className="text-sm text-slate-600 dark:text-slate-300">{formatMXN(q.total)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Sección 3 — Items de trabajo */}
            <section className="px-4 py-4 sm:px-6 sm:py-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Items de trabajo
                <span className="ml-2 font-normal normal-case text-slate-600">
                  ({order.items.length})
                </span>
              </h3>
              {order.items.length === 0 ? (
                <p className="text-sm text-slate-600">Sin items registrados</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-[#1a2d4d] dark:bg-[#0a1628]">
                  {order.items.map((item, idx) => (
                    <OrderItemCard
                      // Use idx as part of key when id is 0 (items from QB search not yet persisted)
                      key={item.id !== 0 ? item.id : `pending-${idx}`}
                      item={item}
                      onAssign={setAssignItem}
                      onDesasignar={(target, inspector) => setDesasignarTarget({ item: target, inspector })}
                      canAsignar={canAsignar}
                      canDocumentos={canDocumentos}
                      indefinite={isIndefiniteInventoryPlant(order.plantName)}
                      uploadingTarget={uploadingTarget}
                      onUploadDoc={handleUploadDoc}
                      onViewDoc={handleViewDoc}
                      uploadError={uploadError}
                    />
                  ))}
                </div>
              )}
            </section>

          </div>

          {/* Hidden file input — shared across all items; pendingUploadRef tracks which item */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={handleFileChange}
            aria-hidden="true"
          />
        </div>
      </div>

      {assignItem !== null && (
        <AssignItemModal
          orderItemId={assignItem.id}
          item={assignItem}
          order={order}
          inspectors={inspectors}
          busyInspectorIds={busyInspectorIds}
          state={assignState}
          action={assignAction}
          onClose={() => setAssignItem(null)}
        />
      )}

      {viewDoc !== null && (
        <DocViewerModal
          href={viewDoc.href}
          title={viewDoc.title}
          onClose={() => setViewDoc(null)}
        />
      )}

      {desasignarTarget !== null && (
        <DesasignarConfirmModal
          orderItemId={desasignarTarget.item.id}
          inspector={desasignarTarget.inspector}
          state={desasignarState}
          action={desasignarAction}
          onClose={() => setDesasignarTarget(null)}
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

  return (
    <div className="shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-[#0c1829] dark:bg-[#0c1829] dark:shadow-none">
      <div className="overflow-x-auto">
      <table className="w-full table-auto text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-[#1a2d4d] dark:bg-[#0a1628]">
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-black dark:text-white">
              Consecutivo
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-black dark:text-white">
              Cliente
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-black dark:text-white">
              Planta
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-black dark:text-white">
              No. Parte
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-black dark:text-white">
              Inventario
            </th>
            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-black dark:text-white">
              Items
            </th>
            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-black dark:text-white">
              Sin asignar
            </th>
          </tr>
        </thead>
        <tbody>
          {paged.map((order) => {
            const pending = countPendingUnassigned(order)
            const inv = getOrderInventory(order.items, isIndefiniteInventoryPlant(order.plantName))
            const invPct = Math.round(inv.pct * 100)
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
                className="cursor-pointer border-b border-white transition-colors last:border-b-0 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:border-[#1a2d4d] dark:hover:bg-[#111a30]"
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
                <td className="px-4 py-3">
                  {inv.indefinite ? (
                    <span className="text-xs italic text-slate-400">Indefinido</span>
                  ) : inv.total === 0 ? (
                    <span className="text-xs text-slate-400">—</span>
                  ) : (
                    <div className="flex items-center gap-1.5" title={`${inv.done.toLocaleString('es-MX')} de ${inv.total.toLocaleString('es-MX')} piezas (${invPct}%)`}>
                      {inv.complete ? (
                        <CheckCircle2 size={14} className="flex-shrink-0 text-green-500" aria-label="Inventario completado" />
                      ) : inv.level === 'warning' ? (
                        <AlertTriangle size={14} className="flex-shrink-0 text-amber-500" aria-label="Inventario por agotarse" />
                      ) : null}
                      <span
                        className={`text-xs tabular-nums ${
                          inv.complete
                            ? 'font-semibold text-green-600 dark:text-green-400'
                            : inv.level === 'warning'
                              ? 'font-semibold text-amber-600 dark:text-amber-400'
                              : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {inv.done.toLocaleString('es-MX')}/{inv.total.toLocaleString('es-MX')} ({invPct}%)
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-100 dark:border-[#25395f] dark:bg-[#111a30] px-2 text-xs text-slate-500 dark:text-slate-400">
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
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Mostrando{' '}
            <span className="font-medium text-slate-900 dark:text-white">{from}–{to}</span>{' '}
            de{' '}
            <span className="font-medium text-slate-900 dark:text-white">{orders.length}</span>{' '}
            registros
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Página anterior"
              className="flex items-center justify-center h-8 w-8 rounded-lg border border-blue-200 dark:border-[#1a2d4d] text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Página siguiente"
              className="flex items-center justify-center h-8 w-8 rounded-lg border border-blue-200 dark:border-[#1a2d4d] text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function CargaDeTrabajoPage({ orders, inspectors, rol, permisos }: CargaDeTrabajoPageProps) {
  const router = useRouter()
  const session: SessionLike = { rol, permisos }
  const canImportar = can(session, 'cotizaciones.importar')
  const canAsignar = can(session, 'ordenes.asignar')
  const canDocumentos = can(session, 'ordenes.documentos')
  const [selectedOrder, setSelectedOrder] = useState<OrderWorkload | null>(null)
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return orders
    return orders.filter(
      (o) =>
        (o.consecutiveNumber ?? '').toLowerCase().includes(q) ||
        (o.clientName ?? '').toLowerCase().includes(q) ||
        (o.plantName ?? '').toLowerCase().includes(q),
    )
  }, [orders, searchQuery])

  // Inspectors already assigned to ANY item across the whole workload — disabled
  // in the assign modal's checklist ("ocupado") so a supervisor can't double-assign.
  const busyInspectorIds = useMemo(() => {
    const busy = new Set<number>()
    for (const order of orders) {
      for (const item of order.items) {
        for (const inspector of item.assignedInspectors) {
          busy.add(inspector.id)
        }
      }
    }
    return busy
  }, [orders])

  // Sync selectedOrder when server data refreshes after assign/release/upload
  useEffect(() => {
    if (selectedOrder === null) return
    const updated = orders.find((o) => o.id === selectedOrder.id)
    if (updated) setSelectedOrder(updated)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders])

  const totalPending = orders.reduce(
    (sum, order) => sum + countPendingUnassigned(order),
    0,
  )

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4 sm:p-6">

        <div className="shrink-0 flex items-start justify-between gap-4">
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
          {canImportar && (
          <button
            type="button"
            onClick={() => setSearchModalOpen(true)}
            className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            <FileSearch size={15} aria-hidden="true" />
            Buscar cotización
          </button>
          )}
        </div>

        <div className="shrink-0 relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por N. orden, cliente o planta…"
            className="w-full rounded-lg border border-slate-200 bg-white dark:border-[#1a2d4d] dark:bg-[#0c1829] pl-9 pr-4 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
          />
        </div>

        {filteredOrders.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white dark:border-[#1a2d4d] dark:bg-[#0c1829] py-16">
            <Briefcase size={32} className="text-slate-600" aria-hidden="true" />
            <p className="text-sm text-slate-500">
              {searchQuery.trim() ? `Sin resultados para "${searchQuery.trim()}"` : 'Sin órdenes activas asignadas'}
            </p>
          </div>
        ) : (
          <OrdersTable orders={filteredOrders} onRowClick={setSelectedOrder} />
        )}
      </div>

      {selectedOrder !== null && (
        <OrderDetailModal
          order={selectedOrder}
          inspectors={inspectors}
          busyInspectorIds={busyInspectorIds}
          onClose={() => setSelectedOrder(null)}
          canAsignar={canAsignar}
          canDocumentos={canDocumentos}
        />
      )}

      {searchModalOpen && canImportar && (
        <SearchCotizacionModal
          onClose={() => setSearchModalOpen(false)}
          onOrderFound={(order) => {
            setSearchModalOpen(false)
            setSelectedOrder(order)
            router.refresh()
          }}
        />
      )}

    </div>
  )
}
