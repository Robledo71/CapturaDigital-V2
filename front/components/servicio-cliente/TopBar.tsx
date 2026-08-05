import { InformalOrdersBell } from '@/front/components/notifications/InformalOrdersBell'

interface TopBarProps {
  crumb?: string
  /** Si el usuario puede ver órdenes informales, se muestra la campana. */
  showNotifications?: boolean
}

export function TopBar({ crumb, showNotifications = false }: TopBarProps) {
  return (
    <header className="h-12 flex-shrink-0 flex items-center justify-between border-b border-[#F5F5F7] bg-[#F5F5F7] pl-12 pr-4 dark:border-[#070E1A] dark:bg-[#070E1A] lg:px-6">
      <span className="text-sm text-slate-600 dark:text-slate-200">{crumb ?? 'Servicio al Cliente'}</span>
      <div className="flex items-center gap-3">
        {showNotifications && <InformalOrdersBell detailHref="/servicio-cliente/ordenes-informales" />}
      </div>
    </header>
  )
}
