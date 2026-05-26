'use client'

import { Clock, MapPin, TabletSmartphone, User } from 'lucide-react'
import type { SupervisorTabletRow } from '@/back/services/tabletService'

interface TabletPageProps {
  tablets: SupervisorTabletRow[]
}

const STATUS_CONFIG = {
  activa:        { label: 'Activa',        pill: 'bg-green-100 border border-green-300 text-green-700 dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-400',  dot: 'bg-green-600 dark:bg-green-400'  },
  inactiva:      { label: 'Inactiva',      pill: 'bg-slate-100 border border-slate-300 text-slate-600 dark:bg-slate-500/10 dark:border-slate-500/20 dark:text-slate-400',  dot: 'bg-slate-500'  },
  mantenimiento: { label: 'Mantenimiento', pill: 'bg-amber-100 border border-amber-300 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400',  dot: 'bg-amber-600 dark:bg-amber-400'  },
} as const

type Status = keyof typeof STATUS_CONFIG

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as Status] ?? {
    label: 'Desconocido',
    pill:  'bg-slate-500/10 border border-slate-500/20 text-slate-400',
    dot:   'bg-slate-500',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} aria-hidden="true" />
      {config.label}
    </span>
  )
}

interface TabletCardProps {
  tablet: SupervisorTabletRow
}

function TabletCard({ tablet }: TabletCardProps) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 dark:bg-[#0c1829] dark:border-[#1a2d4d] overflow-hidden">
      {/* Card header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3">
        <div className="flex items-start gap-3">
          {/* Tablet icon with online indicator */}
          <div className="relative shrink-0">
            <div className="w-12 h-14 rounded-lg border border-slate-200 bg-slate-50 dark:border-[#1a2d4d] dark:bg-[#070e1a] flex items-center justify-center text-blue-400">
              <TabletSmartphone size={24} strokeWidth={1.5} />
            </div>
            {/* Online dot */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#0c1829] ${
                tablet.isOnline ? 'bg-green-400 animate-pulse' : 'bg-slate-400 dark:bg-slate-600'
              }`}
              aria-label={tablet.isOnline ? 'En línea' : 'Sin conexión'}
            />
          </div>

          {/* Identity */}
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-slate-900 dark:text-white leading-tight">{tablet.alias}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400 leading-tight">{tablet.model}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 leading-tight">SN: {tablet.serialNumber}</span>
          </div>
        </div>

        <StatusBadge status={tablet.status} />
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-slate-100 dark:border-[#1a2d4d]" />

      {/* Card footer — meta rows */}
      <div className="px-4 py-3 flex flex-col gap-2">
        {/* Last inspector */}
        <div className="flex items-center gap-2 text-sm">
          <User size={13} className="text-slate-400 dark:text-slate-500 shrink-0" aria-hidden="true" />
          <span className="text-slate-400 dark:text-slate-500 w-36 shrink-0">Último inspector</span>
          {tablet.lastInspector ? (
            <span className="text-slate-700 dark:text-slate-300">{tablet.lastInspector}</span>
          ) : (
            <span className="text-slate-400 dark:text-slate-600 italic">Sin uso registrado</span>
          )}
        </div>

        {/* Last activity */}
        <div className="flex items-center gap-2 text-sm">
          <Clock size={13} className="text-slate-400 dark:text-slate-500 shrink-0" aria-hidden="true" />
          <span className="text-slate-400 dark:text-slate-500 w-36 shrink-0">Última actividad</span>
          {tablet.lastUsedAt ? (
            <span className="text-slate-700 dark:text-slate-300">{tablet.lastUsedAt}</span>
          ) : (
            <span className="text-slate-400 dark:text-slate-600 italic">Sin actividad</span>
          )}
        </div>

        {/* Plant — only when present */}
        {tablet.plantName && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin size={13} className="text-slate-400 dark:text-slate-500 shrink-0" aria-hidden="true" />
            <span className="text-slate-400 dark:text-slate-500 w-36 shrink-0">Planta</span>
            <span className="text-slate-700 dark:text-slate-300">{tablet.plantName}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function TabletPage({ tablets }: TabletPageProps) {
  const total        = tablets.length
  const activas      = tablets.filter((t) => t.status === 'activa').length
  const mantenimiento = tablets.filter((t) => t.status === 'mantenimiento').length

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

        {/* Page header */}
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Tablets</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {total} total · {activas} activas · {mantenimiento} en mantenimiento
          </p>
        </div>

        {/* Cards grid / empty state */}
        {tablets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <TabletSmartphone size={40} className="text-slate-700 mb-3" strokeWidth={1.5} />
            <p className="text-slate-500 text-sm">No hay tablets registradas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
            {tablets.map((tablet) => (
              <TabletCard key={tablet.id} tablet={tablet} />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
