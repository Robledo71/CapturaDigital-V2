'use client'

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { StatCard } from '@/front/components/supervisor/StatCard'
import type { GerenteDashboardData, ReportePorEstado } from '@/back/services/gerenteDashboardService'

// ─── Palette ──────────────────────────────────────────────────────────────────

const PALETTE = {
  ok:        '#1e3a5f',
  ng:        '#f97316',
  scrap:     '#93c5fd',
  recovered: '#bfdbfe',
  ordenes:   '#93c5fd',
  reportes:  '#1e40af',
  clientes:  '#1e40af',
  submitted: '#64748b',
  sampled:  '#f59e0b',
  signed:    '#3b82f6',
  published: '#22c55e',
}

const TICK_COLOR  = '#94a3b8'
const GRID_COLOR  = '#e2e8f0'
const LABEL_COLOR = '#475569'

// ─── Estado labels ────────────────────────────────────────────────────────────

const ESTADO_LABEL: Record<ReportePorEstado['estado'], string> = {
  submitted: 'Enviado',
  sampled:  'En muestreo',
  signed:    'Firmado',
  published: 'Publicado',
}

const ESTADO_COLOR: Record<ReportePorEstado['estado'], string> = {
  submitted: PALETTE.submitted,
  sampled:  PALETTE.sampled,
  signed:    PALETTE.signed,
  published: PALETTE.published,
}

// ─── Month formatter (avoids Date timezone drift) ────────────────────────────

const MESES_ABREV = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** 'YYYY-MM' → 'ene 26' */
function formatMes(yyyymm: string): string {
  const [yearStr, monthStr] = yyyymm.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10) // 1-based
  const label = MESES_ABREV[month - 1] ?? monthStr
  const shortYear = String(year).slice(-2)
  return `${label} ${shortYear}`
}

/** Trunca nombres largos de planta/cliente para que quepan en el eje. */
function truncateLabel(name: string, max = 16): string {
  return name.length > max ? `${name.slice(0, max)}…` : name
}

// ─── Semaphore color for %NG ──────────────────────────────────────────────────

function ngSemaphoreColor(pctNG: number): string {
  if (pctNG > 0.03) return '#ef4444'   // red   >3%
  if (pctNG > 0.01) return '#f59e0b'   // amber 1-3%
  return '#22c55e'                      // green <1%
}

function ngTextColor(pctNG: number): string {
  if (pctNG > 0.05) return 'text-red-500 dark:text-red-400'
  if (pctNG > 0.02) return 'text-yellow-500 dark:text-yellow-400'
  return 'text-green-500 dark:text-green-400'
}

// ─── Tooltip styles ───────────────────────────────────────────────────────────

const tooltipContentStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  color: '#0f172a',
  fontSize: '12px',
  boxShadow: '0 4px 12px -2px rgba(0,0,0,0.08)',
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

interface SectionCardProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}

function SectionCard({ title, subtitle, action, children }: SectionCardProps) {
  return (
    <div className="min-w-0 rounded-2xl bg-white dark:bg-[#0c1829] border border-slate-100 dark:border-[#0c1829] shadow-sm dark:shadow-none p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-900 dark:text-white text-sm truncate">{title}</h2>
          {subtitle && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface GerenteDashboardProps {
  data: GerenteDashboardData
}

export function GerenteDashboard({ data }: GerenteDashboardProps) {
  const { totals, reportesPorEstado, piezas, porPlanta, reportesEnTiempo, ngPorPlanta, topClientes } = data

  // Pie data for reportes por estado — orden descendente para que la leyenda resalte lo más relevante
  const pieData = reportesPorEstado
    .map((r) => ({
      name: ESTADO_LABEL[r.estado] ?? r.estado,
      value: r.cantidad,
      color: ESTADO_COLOR[r.estado] ?? '#94a3b8',
    }))
    .sort((a, b) => b.value - a.value)

  const totalReportesEstado = pieData.reduce((sum, e) => sum + e.value, 0)

  // Bar data for piezas
  const piezasData = [
    { name: 'OK',         value: piezas.ok,        fill: PALETTE.ok },
    { name: 'NG',         value: piezas.ng,        fill: PALETTE.ng },
    { name: 'Scrap',      value: piezas.scrap,     fill: PALETTE.scrap },
    { name: 'Recuperada', value: piezas.recovered, fill: PALETTE.recovered },
  ]

  const pctNGFormatted = `${(piezas.pctNG * 100).toFixed(2)}%`

  // Tendencia: format mes labels
  const tendenciaData = reportesEnTiempo.map((r) => ({
    label: formatMes(r.mes),
    recibidos: r.recibidos,
  }))

  // %NG por planta: add formatted pct and semaphore color
  const ngPlantaData = ngPorPlanta.map((p) => ({
    ...p,
    pctDisplay: parseFloat((p.pctNG * 100).toFixed(2)),
    barColor: ngSemaphoreColor(p.pctNG),
  }))

  // Top clientes
  const topClientesData = topClientes.map((c) => ({
    ...c,
  }))

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4">

      {/* KPIs */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Órdenes activas"
          value={String(totals.ordenesActivas)}
          subtitle="Órdenes en curso"
          dotColor="blue"
        />
        <StatCard
          label="Reportes totales"
          value={String(totals.reportesTotales)}
          subtitle="Todos los reportes"
          dotColor="green"
        />
        <StatCard
          label="Pendientes revisión"
          value={String(totals.pendientesRevision)}
          subtitle="Esperan revisión"
          dotColor="yellow"
        />
        <StatCard
          label="Publicados"
          value={String(totals.publicados)}
          subtitle="Reportes publicados"
          dotColor="none"
        />
      </div>

      {/* Fila 1: Reportes por estado | Calidad de piezas | Reportes recibidos */}
      <div className="shrink-0 grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Reportes por estado — Donut con total al centro */}
        <SectionCard title="Reportes por estado">
          {pieData.length === 0 ? (
            <EmptyState label="Sin datos" />
          ) : (
            <div className="flex items-center gap-3">
              <div className="relative shrink-0" style={{ width: 130, height: 130 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipContentStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">
                    {totalReportesEstado.toLocaleString('es-MX')}
                  </p>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-0.5">
                    Total
                  </p>
                </div>
              </div>
              <ul className="flex flex-col gap-1.5 min-w-0 flex-1">
                {pieData.map((entry) => (
                  <li key={entry.name} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="truncate">{entry.name}</span>
                    <span className="ml-auto font-mono font-bold text-slate-900 dark:text-white">{entry.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>

        {/* Calidad de piezas */}
        <SectionCard
          title="Calidad de piezas"
          subtitle={`${piezas.totalInspeccionadas.toLocaleString('es-MX')} piezas inspeccionadas`}
          action={
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                % NG
              </span>
              <span className={`text-sm font-bold ${ngTextColor(piezas.pctNG)}`}>{pctNGFormatted}</span>
            </div>
          }
        >
          {piezas.totalInspeccionadas === 0 ? (
            <EmptyState label="Sin datos de piezas" />
          ) : (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={piezasData} barCategoryGap="25%" margin={{ top: 16, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: TICK_COLOR, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: TICK_COLOR, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip contentStyle={tooltipContentStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {piezasData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={(v) => Number(v ?? 0).toLocaleString('es-MX')}
                    style={{ fontSize: 10, fontWeight: 700, fill: LABEL_COLOR }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Tendencia de reportes (últimos 6 meses) */}
        <SectionCard title="Reportes recibidos" subtitle="Últimos 6 meses">
          {tendenciaData.length === 0 ? (
            <EmptyState label="Sin datos" />
          ) : (
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart
                data={tendenciaData}
                margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="gradReportes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={PALETTE.reportes} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={PALETTE.reportes} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: TICK_COLOR, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: TICK_COLOR, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  cursor={{ stroke: PALETTE.reportes, strokeWidth: 1, strokeDasharray: '4 2' }}
                  formatter={(value) => [Number(value ?? 0), 'Reportes']}
                />
                <Area
                  type="monotone"
                  dataKey="recibidos"
                  name="Reportes"
                  stroke={PALETTE.reportes}
                  strokeWidth={2}
                  fill="url(#gradReportes)"
                  dot={{ r: 3, fill: PALETTE.reportes, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: PALETTE.reportes, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* Fila 2: Actividad por planta | % NG por planta | Top clientes */}
      <div className="shrink-0 grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Órdenes y reportes por planta */}
        <SectionCard title="Actividad por planta">
          {porPlanta.length === 0 ? (
            <EmptyState label="Sin datos por planta" />
          ) : (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart
                data={porPlanta}
                margin={{ top: 16, right: 8, left: 0, bottom: 4 }}
                barCategoryGap="30%"
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis
                  dataKey="plantName"
                  tick={{ fill: TICK_COLOR, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  tickFormatter={(name: string) => truncateLabel(name, 12)}
                />
                <YAxis
                  tick={{ fill: TICK_COLOR, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip contentStyle={tooltipContentStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={24}
                  wrapperStyle={{ fontSize: '11px', color: TICK_COLOR }}
                />
                <Bar dataKey="reportes" name="Reportes" fill={PALETTE.reportes} radius={[3, 3, 0, 0]} />
                <Bar dataKey="ordenes" name="Órdenes"  fill={PALETTE.ordenes}  radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* % NG por planta — horizontal BarChart */}
        <SectionCard title="% NG por planta">
          {ngPlantaData.length === 0 ? (
            <EmptyState label="Sin datos" />
          ) : (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart
                data={ngPlantaData}
                layout="vertical"
                margin={{ top: 4, right: 32, left: 4, bottom: 4 }}
                barCategoryGap="25%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: TICK_COLOR, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                />
                <YAxis
                  type="category"
                  dataKey="plantName"
                  tick={{ fill: TICK_COLOR, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                  tickFormatter={(name: string) => truncateLabel(name, 14)}
                />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  formatter={(value, _name, props) => {
                    const pct = Number(value ?? 0)
                    const pzas = (props.payload as { totalInspeccionadas?: number })?.totalInspeccionadas ?? 0
                    return [`${pct.toFixed(2)}%  (${pzas.toLocaleString('es-MX')} pzas)`, '% NG']
                  }}
                />
                <Bar dataKey="pctDisplay" name="% NG" radius={[0, 4, 4, 0]}>
                  {ngPlantaData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.barColor} />
                  ))}
                  <LabelList
                    dataKey="pctDisplay"
                    position="right"
                    formatter={(v) => `${Number(v ?? 0).toFixed(1)}%`}
                    style={{ fontSize: 10, fontWeight: 700, fill: LABEL_COLOR }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Top clientes por piezas — horizontal BarChart */}
        <SectionCard title="Top clientes por piezas">
          {topClientesData.length === 0 ? (
            <EmptyState label="Sin datos" />
          ) : (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart
                data={topClientesData}
                layout="vertical"
                margin={{ top: 4, right: 44, left: 4, bottom: 4 }}
                barCategoryGap="25%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="clientName"
                  tick={{ fill: TICK_COLOR, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                  tickFormatter={(name: string) => truncateLabel(name, 14)}
                />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  formatter={(value, _name, props) => {
                    const pzas = Number(value ?? 0)
                    const reps = (props.payload as { reportes?: number })?.reportes ?? 0
                    return [`${pzas.toLocaleString('es-MX')} pzas  (${reps} reportes)`, 'Piezas']
                  }}
                />
                <Bar
                  dataKey="piezas"
                  name="Piezas"
                  fill={PALETTE.clientes}
                  radius={[0, 4, 4, 0]}
                >
                  <LabelList
                    dataKey="piezas"
                    position="right"
                    formatter={(v) => Number(v ?? 0).toLocaleString('es-MX')}
                    style={{ fontSize: 10, fontWeight: 700, fill: LABEL_COLOR }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

      </div>

    </div>
  )
}
