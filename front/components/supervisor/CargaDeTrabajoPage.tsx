'use client'

import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Briefcase, CheckCircle2, ChevronLeft, ChevronRight, FileCheck, FileSearch, Loader2, Search, TabletSmartphone, Upload, X } from 'lucide-react'
import { getOrderInventory, isIndefiniteInventoryPlant } from '@/front/lib/inventory'
import type {
  OrderWorkload,
  OrderItemWorkload,
  TabletOption,
} from '@/back/services/cargaDeTrabajoService'
import {
  assignOrderItemAction,
  type AssignOrderItemState,
} from '@/app/actions/assign-order-item'
import {
  releaseOrderItemAction,
  type ReleaseOrderItemState,
} from '@/app/actions/release-order-item'
import { uploadOrderDocumentAction } from '@/app/actions/upload-order-document'
import { SearchCotizacionModal } from './SearchCotizacionModal'
import { can, type SessionLike } from '@/front/lib/permisos'

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

// ─── Types ────────────────────────────────────────────────────────────────────

interface CargaDeTrabajoPageProps {
  orders: OrderWorkload[]
  tablets: TabletOption[]
  rol: string
  permisos?: string[] | null
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

function AssignSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {pending ? 'Asignando...' : 'Asignar'}
    </button>
  )
}

// ─── Assign Item Modal ────────────────────────────────────────────────────────

interface AssignItemModalProps {
  /** DB id of the OrderItem, or 0 if the item is not yet persisted (came from QB search). */
  orderItemId: number
  /** Full item data — needed to embed hidden QB fields when orderItemId === 0. */
  item: OrderItemWorkload
  /** Parent order — needed to embed hidden QB order/quotation fields when orderItemId === 0. */
  order: OrderWorkload
  tablets: TabletOption[]
  state: AssignOrderItemState
  action: (formData: FormData) => void
  onClose: () => void
}

function AssignItemModal({ orderItemId, item, order, tablets, state, action, onClose }: AssignItemModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  // When the item has not been persisted yet (id === 0), we need to find which
  // quotation this item belongs to from the parent order's quotation list.
  const parentQuotation = order.quotations.find(
    (q) => q.consecutiveNumber === item.quotationConsecutive
  ) ?? order.quotations[0]

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
        className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#25395f] dark:bg-[#111a30] shadow-2xl animate-scale-in"
      >
        <input type="hidden" name="orderItemId" value={String(orderItemId)} />

        {/* When the item is not yet in DB (id=0), embed raw QB data so the
            server action can persist Order → Quotation → OrderItem first. */}
        {orderItemId === 0 && (
          <>
            {/* Order fields */}
            <input type="hidden" name="qb_order_id" value={String(order.id)} />
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
            <input type="hidden" name="qb_quotation_id" value={String(parentQuotation?.id ?? '')} />
            <input type="hidden" name="qb_quotation_consecutive" value={item.quotationConsecutive ?? ''} />
            <input type="hidden" name="qb_quotation_client_email" value={parentQuotation?.clientEmail ?? ''} />
            <input type="hidden" name="qb_quotation_purchase_order_number" value={parentQuotation?.purchaseOrderNumber ?? ''} />
            <input type="hidden" name="qb_quotation_contact_emails" value={parentQuotation?.contactEmails ?? ''} />
            <input type="hidden" name="qb_quotation_order_user_name" value={parentQuotation?.orderUserName ?? ''} />
            <input type="hidden" name="qb_quotation_order_consecutive_number" value={parentQuotation?.orderConsecutiveNumber ?? order.consecutiveNumber ?? ''} />
            <input type="hidden" name="qb_quotation_status" value={parentQuotation?.status ?? ''} />
            <input type="hidden" name="qb_quotation_plant_name" value={order.plantName ?? ''} />
            {/* OrderItem fields */}
            <input type="hidden" name="qb_item_part_number" value={item.partNumber === '—' ? '' : item.partNumber} />
            <input type="hidden" name="qb_item_part_name" value={item.partName === '—' ? '' : item.partName} />
            <input type="hidden" name="qb_item_inventory" value={String(item.inventario)} />
            <input type="hidden" name="qb_item_inventory_done" value={String(item.inventarioTerminado)} />
            <input type="hidden" name="qb_item_plant_name" value={order.plantName ?? ''} />
          </>
        )}

        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#25395f] px-5 py-4">
          <h3 id="sub-modal-titulo" className="text-sm font-semibold text-slate-900 dark:text-white">
            Asignar tablet al item
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
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Tablet</span>
            <select
              name="tabletId"
              required
              defaultValue=""
              className="rounded-md border border-slate-300 bg-white dark:border-[#31476f] dark:bg-[#0c1426] px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
            >
              <option value="" disabled>
                Selecciona una tablet
              </option>
              {tablets.map((tablet) => (
                <option key={tablet.id} value={`${tablet.id}:${tablet.codigoTablet}`}>
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

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-[#25395f] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 dark:border-[#31476f] px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            Cancelar
          </button>
          <AssignSubmitButton />
        </div>
      </form>
    </div>
  )
}

// ─── Release Item Modal ───────────────────────────────────────────────────────

interface ReleaseItemModalProps {
  orderItemId: number
  partNumber: string
  isInProgress?: boolean
  hasSubmittedReport?: boolean
  state: ReleaseOrderItemState
  action: (formData: FormData) => void
  onClose: () => void
}

function ReleaseSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {pending ? 'Liberando...' : 'Confirmar'}
    </button>
  )
}

function ReleaseItemModal({ orderItemId, partNumber, isInProgress, hasSubmittedReport = false, state, action, onClose }: ReleaseItemModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="release-modal-titulo"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm animate-fade-in"
      onClick={handleOverlayClick}
    >
      <form
        action={action}
        className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#25395f] dark:bg-[#111a30] shadow-2xl animate-scale-in"
      >
        <input type="hidden" name="orderItemId" value={String(orderItemId)} />

        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#25395f] px-5 py-4">
          <h3 id="release-modal-titulo" className="text-sm font-semibold text-slate-900 dark:text-white">
            Liberar tablet
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
          <p className="text-sm text-slate-600 dark:text-slate-300">
            ¿Liberar la tablet asignada al item{' '}
            <span className="font-mono font-medium text-slate-900 dark:text-white">{partNumber}</span>?
          </p>
          <p className="text-xs text-slate-500">
            La tablet volverá a estar disponible para nuevas asignaciones.
          </p>

          {isInProgress && (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              Este ítem tiene una inspección en curso. Al liberar la tablet, la sesión activa será cancelada.
            </p>
          )}

          {hasSubmittedReport && (
            <p className="rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-300">
              Este ítem tiene un reporte enviado. Al liberar la tablet, la sesión se cerrará y el reporte quedará disponible para revisión.
            </p>
          )}

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
          <ReleaseSubmitButton />
        </div>
      </form>
    </div>
  )
}

// ─── Order Item Row ───────────────────────────────────────────────────────────

interface OrderItemRowProps {
  item: OrderItemWorkload
  /** Called with the full item object so the assign modal can embed QB hidden fields when item.id === 0. */
  onAssign: (item: OrderItemWorkload) => void
  /** true cuando la planta no maneja inventario — muestra "Indefinido" en lugar de la cantidad. */
  indefinite?: boolean
  onRelease: (itemId: number) => void
  canAsignar: boolean
}

function OrderItemRow({ item, onAssign, onRelease, canAsignar, indefinite = false }: OrderItemRowProps) {
  // Se puede asignar si el ítem no tiene tablet activa y NUNCA ha enviado reportes:
  // - 'pending'   → recién creado, sin asignar.
  // - 'completed' → liberado sin haber sido trabajado (sin reportes) → se permite reasignar.
  // Si ya envió reportes (hasSubmittedReport), queda como estado terminal y NO se reasigna.
  const canAssign =
    item.assignedTablet === null &&
    !item.hasSubmittedReport &&
    (item.status === 'pending' || item.status === 'completed')
  const canRelease = item.status === 'assigned' || item.status === 'in_progress'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-[#1a2d4d] px-4 py-3 last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-mono text-xs font-medium text-slate-800 dark:text-slate-200">{item.partNumber}</span>
        <span className="text-xs text-slate-400">{item.partName}</span>
        {item.quotationConsecutive && (
          <span className="text-xs text-slate-500">
            Cotización: <span className="font-mono text-slate-400">{item.quotationConsecutive}</span>
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">
          {indefinite ? (
            <span className="italic text-slate-400">Indefinido</span>
          ) : (
            <>{item.inventario.toLocaleString('es-MX')} pzs</>
          )}
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


        {item.hasSubmittedReport && item.status !== 'completed' && (
          <span className="text-xs text-amber-500">Reporte enviado</span>
        )}
        {canAsignar && canAssign && (
          <button
            type="button"
            onClick={() => onAssign(item)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 transition-colors hover:border-blue-400 hover:bg-blue-500/20"
          >
            Asignar tablet
          </button>
        )}

        {canAsignar && canRelease && (
          <button
            type="button"
            onClick={() => onRelease(item.id)}
            className="inline-flex items-center rounded-lg border border-red-500/30 px-2.5 py-1 text-xs text-red-400 transition-colors hover:border-red-400 hover:bg-red-500/10"
          >
            Liberar
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
  canAsignar: boolean
  canDocumentos: boolean
}

function OrderDetailModal({ order, tablets, onClose, canAsignar, canDocumentos }: OrderDetailModalProps) {
  const router = useRouter()
  const overlayRef = useRef<HTMLDivElement>(null)
  // Store the full item object so AssignItemModal can embed QB hidden fields when item.id === 0
  const [assignItem, setAssignItem] = useState<OrderItemWorkload | null>(null)
  const [releaseItemId, setReleaseItemId] = useState<number | null>(null)
  const [assignState, assignAction] = useActionState(assignOrderItemAction, undefined)
  const [releaseState, releaseAction] = useActionState(releaseOrderItemAction, undefined)
  const [uploadState, uploadAction] = useActionState(uploadOrderDocumentAction, undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const activeDocTypeRef = useRef<'hoe' | 'arranque-seguro' | null>(null)
  const [uploadingDocType, setUploadingDocType] = useState<'hoe' | 'arranque-seguro' | null>(null)
  const [uploadSuccessVisible, setUploadSuccessVisible] = useState(false)

  useEffect(() => {
    if (uploadState === undefined) return
    setUploadingDocType(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (uploadState.ok) {
      router.refresh()
      // Muestra el mensaje de éxito y lo oculta automáticamente a los 4 s.
      setUploadSuccessVisible(true)
      const t = setTimeout(() => setUploadSuccessVisible(false), 4000)
      return () => clearTimeout(t)
    }
  }, [uploadState, router])

  function handleUploadClick(docType: 'hoe' | 'arranque-seguro') {
    activeDocTypeRef.current = docType
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const docType = activeDocTypeRef.current
    if (!file || !docType) return
    const fd = new FormData()
    fd.set('orderId', String(order.id))
    fd.set('docType', docType)
    fd.set('file', file)
    startTransition(() => {
      setUploadingDocType(docType)
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
    if (releaseState?.ok === true) {
      setReleaseItemId(null)
      router.refresh()
    }
  }, [releaseState, router])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && assignItem === null && releaseItemId === null) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, assignItem, releaseItemId])

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current && assignItem === null && releaseItemId === null) onClose()
  }

  return (
    <>
      <div
        ref={overlayRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-modal-titulo"
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-8 backdrop-blur-sm animate-fade-in"
        onClick={handleOverlayClick}
      >
        <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#25395f] dark:bg-[#0c1829] shadow-2xl animate-scale-in">

          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 dark:border-[#1a2d4d] px-6 py-5">
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

          <div className="flex flex-col gap-0 divide-y divide-slate-200 dark:divide-[#1a2d4d]">

            {/* Sección 1 — Datos de la orden */}
            <section className="px-6 py-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Datos de la orden
              </h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
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
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-[#1a2d4d] dark:bg-[#0a1628]">
                  {order.items.map((item, idx) => (
                    <OrderItemRow
                      // Use idx as part of key when id is 0 (items from QB search not yet persisted)
                      key={item.id !== 0 ? item.id : `pending-${idx}`}
                      item={item}
                      onAssign={setAssignItem}
                      onRelease={setReleaseItemId}
                      canAsignar={canAsignar}
                      indefinite={isIndefiniteInventoryPlant(order.plantName)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Sección 4 — Documentos */}
            {canDocumentos && (
            <section className="px-6 py-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Documentos
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={uploadingDocType !== null}
                    onClick={() => handleUploadClick('hoe')}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      order.hoe
                        ? 'border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20'
                        : 'border-slate-300 text-slate-600 dark:border-[#31476f] dark:text-slate-300 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-300'
                    }`}
                  >
                    {uploadingDocType === 'hoe' ? (
                      <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                    ) : order.hoe ? (
                      <FileCheck size={14} aria-hidden="true" />
                    ) : (
                      <Upload size={14} aria-hidden="true" />
                    )}
                    {uploadingDocType === 'hoe'
                      ? 'Subiendo...'
                      : order.hoe
                        ? 'HOE cargado'
                        : 'Agregar HOE'}
                  </button>

                  <button
                    type="button"
                    disabled={uploadingDocType !== null}
                    onClick={() => handleUploadClick('arranque-seguro')}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      order.arranqueSeguro
                        ? 'border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20'
                        : 'border-slate-300 text-slate-600 dark:border-[#31476f] dark:text-slate-300 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-300'
                    }`}
                  >
                    {uploadingDocType === 'arranque-seguro' ? (
                      <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                    ) : order.arranqueSeguro ? (
                      <FileCheck size={14} aria-hidden="true" />
                    ) : (
                      <Upload size={14} aria-hidden="true" />
                    )}
                    {uploadingDocType === 'arranque-seguro'
                      ? 'Subiendo...'
                      : order.arranqueSeguro
                        ? 'Arranque Seguro cargado'
                        : 'Agregar Arranque Seguro'}
                  </button>
                </div>

                {uploadState && !uploadState.ok && (
                  <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                    {uploadState.error}
                  </p>
                )}
                {uploadState?.ok && uploadSuccessVisible && (
                  <p className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
                    Documento &quot;{uploadState.docType === 'hoe' ? 'HOE' : 'Arranque Seguro'}&quot; subido correctamente.
                  </p>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
            </section>
            )}
          </div>
        </div>
      </div>

      {assignItem !== null && (
        <AssignItemModal
          orderItemId={assignItem.id}
          item={assignItem}
          order={order}
          tablets={tablets}
          state={assignState}
          action={assignAction}
          onClose={() => setAssignItem(null)}
        />
      )}

      {releaseItemId !== null && (
        <ReleaseItemModal
          orderItemId={releaseItemId}
          partNumber={order.items.find((i) => i.id === releaseItemId)?.partNumber ?? '—'}
          isInProgress={order.items.find((i) => i.id === releaseItemId)?.status === 'in_progress'}
          hasSubmittedReport={order.items.find((i) => i.id === releaseItemId)?.hasSubmittedReport ?? false}
          state={releaseState}
          action={releaseAction}
          onClose={() => setReleaseItemId(null)}
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
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Inventario
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

export function CargaDeTrabajoPage({ orders, tablets, rol, permisos }: CargaDeTrabajoPageProps) {
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

  // Sync selectedOrder when server data refreshes after assign/release
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

        <div className="relative">
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
          tablets={tablets}
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
