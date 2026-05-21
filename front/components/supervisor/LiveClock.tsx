'use client'

import { useState, useEffect } from 'react'

interface LiveClockProps {
  nombre: string
  esperanRevision: number
}

function getGreeting(hour: number): string {
  if (hour >= 0 && hour <= 11) return 'Buenos días'
  if (hour >= 12 && hour <= 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export function LiveClock({ nombre, esperanRevision }: LiveClockProps) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!now) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-blue-950 dark:text-white">&nbsp;</h1>
        <p className="text-sm text-blue-600 dark:text-slate-400 mt-0.5">&nbsp;</p>
      </div>
    )
  }

  const greeting = getGreeting(now.getHours())
  const dateString = now.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const pendingText =
    esperanRevision === 0
      ? 'Sin reportes pendientes'
      : `${esperanRevision} reporte${esperanRevision !== 1 ? 's' : ''} esperan tu revisión`

  return (
    <div>
      <h1 className="text-2xl font-bold text-black dark:text-white">
        {greeting}, {nombre}
      </h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
        {dateString} · {pendingText}
      </p>
    </div>
  )
}
