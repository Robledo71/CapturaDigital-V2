'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { InformalOrdersTable } from '@/front/components/informal-orders/InformalOrdersTable'
import { NuevoOrdenInformalModal } from './NuevoOrdenInformalModal'
import { AsignarSesionInformalModal } from './AsignarSesionInformalModal'
import type { InformalOrderRow } from '@/shared/types/informalOrder'
import type { PlantaRow } from '@/shared/types/planta'
import type { InspectorOption } from '@/back/services/cargaDeTrabajoService'
import { can, type SessionLike } from '@/front/lib/permisos'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrdenesInformalesPageProps {
  orders: InformalOrderRow[]
  clientes: { id: number; nombre: string }[]
  plantas: PlantaRow[]
  inspectors: InspectorOption[]
  /** Permisos efectivos del usuario, para gatear "Nueva orden informal" y "Asignar". */
  rol: string
  permisos?: string[] | null
}

// ─── Main component ────────────────────────────────────────────────────────────

export function OrdenesInformalesPage({ orders, clientes, plantas, inspectors, rol, permisos }: OrdenesInformalesPageProps) {
  const router = useRouter()
  const session: SessionLike = { rol, permisos }
  const canCrear = can(session, 'ordenes_informales.crear')
  const canAsignar = can(session, 'ordenes_informales.asignar')
  const [showNuevoModal, setShowNuevoModal] = useState(false)
  const [assignTarget, setAssignTarget] = useState<InformalOrderRow | null>(null)
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false })

  function showToast(message: string) {
    setToast({ message, visible: true })
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3000)
  }

  function handleCreated() {
    setShowNuevoModal(false)
    showToast('Orden informal creada correctamente')
    router.refresh()
  }

  function handleAssigned() {
    setAssignTarget(null)
    showToast('Inspectores asignados correctamente')
    router.refresh()
  }

  return (
    <>
      {showNuevoModal && (
        <NuevoOrdenInformalModal
          clientes={clientes}
          plantas={plantas}
          inspectors={inspectors}
          onClose={() => setShowNuevoModal(false)}
          onSuccess={handleCreated}
        />
      )}

      {assignTarget && (
        <AsignarSesionInformalModal
          order={assignTarget}
          inspectors={inspectors}
          onClose={() => setAssignTarget(null)}
          onSuccess={handleAssigned}
        />
      )}

      {toast.visible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white dark:bg-[#0c1829] border border-green-500/50 rounded-xl px-5 py-3.5 shadow-2xl transition-all animate-slide-in-right"
        >
          <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0 animate-pulse-dot" aria-hidden="true" />
          <p className="text-sm text-slate-700 dark:text-slate-200">{toast.message}</p>
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">

          {/* Page header */}
          <div className="shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Órdenes informales</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {orders.length} {orders.length === 1 ? 'orden informal' : 'órdenes informales'}
              </p>
            </div>
            {canCrear && (
              <button
                type="button"
                onClick={() => setShowNuevoModal(true)}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap bg-blue-600 hover:bg-blue-500 text-white"
              >
                <Plus size={15} />
                Nueva orden informal
              </button>
            )}
          </div>

          <InformalOrdersTable orders={orders} onAssign={canAsignar ? setAssignTarget : undefined} />

        </div>
      </div>
    </>
  )
}
