'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

interface OfflineBannerProps {
  /** Cantidad de cambios locales pendientes de sincronizar, si aplica. */
  pendingCount?: number
}

export function OfflineBanner({ pendingCount }: OfflineBannerProps) {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

  const hasPending = typeof pendingCount === 'number' && pendingCount > 0

  return (
    <div
      role="status"
      className="shrink-0 flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-300"
    >
      <AlertTriangle size={16} className="flex-shrink-0" aria-hidden="true" />
      {hasPending ? (
        <span>
          Sin conexión — {pendingCount} cambio{pendingCount === 1 ? '' : 's'} pendiente
          {pendingCount === 1 ? '' : 's'} por sincronizar
        </span>
      ) : (
        <span>Sin conexión — los datos mostrados pueden no estar actualizados.</span>
      )}
    </div>
  )
}
