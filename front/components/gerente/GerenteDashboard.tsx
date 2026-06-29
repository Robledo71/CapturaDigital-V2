'use client'

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
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
  ok:        '#22c55e',
  ng:        '#ef4444',
  scrap:     '#f97316',
  recovered: '#3b82f6',
  ordenes:   '#8b5cf6',
  reportes:  '#06b6d4',
  submitted: '#64748b',
  sampled:  '#f59e0b',
  signed:    '#3b82f6',
  published: '#22c55e',
}

const TICK_COLOR  = '#94a3b8'
const GRID_COLOR  = '#1e293b'

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

// ─── Semaphore color for %NG ──────────────────────────────────────────────────

function ngSemaphoreColor(pctNG: number): string {
  if (pctNG > 0.03) return '#ef4444'   // red   >3%
  if (pctNG > 0.01) return '#f59e0b'   // amber 1-3%
  return '#22c55e'                      // green <1%
}

// ─── Tooltip styles ───────────────────────────────────────────────────────────

const tooltipContentStyle = {
  backgroundColor: '#0f2038',
  border: '1px solid #1a2d4d',
  borderRadius: '8px',
  color: '#f1f5f9',
  fontSize: '12px',
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="shrink-0 rounded-xl bg-white dark:bg-[#0c1829] border border-slate-100 dark:border-[#0c1829] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none p-5 flex flex-col gap-4">
      <h2 className="font-bold text-black dark:text-white text-sm">{title}</h2>
      {children}
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-10">
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

  // Pie data for reportes por estado
  const pieData = reportesPorEstado.map((r) => ({
    name: ESTADO_LABEL[r.estado] ?? r.estado,
    value: r.cantidad,
    color: ESTADO_COLOR[r.estado] ?? '#94a3b8',
  }))

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
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">

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

      {/* Reportes por estado + % NG */}
      <div className="shrink-0 grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Reportes por estado — Pie chart */}
        <SectionCard title="Reportes por estado">
          {pieData.length === 0 ? (
            <EmptyState label="Sin datos" />
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
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
              <ul className="flex flex-col gap-2 shrink-0 min-w-0">
                {pieData.map((entry) => (
                  <li key={entry.name} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span
                      className="w-3 h-3 rounded-sm flex-shrink-0"
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

        {/* % NG indicator */}
        <SectionCard title="Calidad de piezas">
          <div className="flex flex-col items-center gap-4">
            {/* Big % NG indicator */}
            <div className="flex flex-col items-center gap-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Porcentaje NG
              </p>
              <p
                className={`text-5xl font-bold leading-none ${
                  piezas.pctNG > 0.05
                    ? 'text-red-500 dark:text-red-400'
                    : piezas.pctNG > 0.02
                    ? 'text-yellow-500 dark:text-yellow-400'
                    : 'text-green-500 dark:text-green-400'
                }`}
              >
                {pctNGFormatted}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {piezas.totalInspeccionadas.toLocaleString('es-MX')} piezas inspeccionadas
              </p>
            </div>

            {/* Piezas bar chart */}
            {piezas.totalInspeccionadas === 0 ? (
              <EmptyState label="Sin datos de piezas" />
            ) : (
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={piezasData} barCategoryGap="20%">
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
                    width={40}
                  />
                  <Tooltip contentStyle={tooltipContentStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {piezasData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Órdenes y reportes por planta */}
      <SectionCard title="Actividad por planta">
        {porPlanta.length === 0 ? (
          <EmptyState label="Sin datos por planta" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={porPlanta}
              margin={{ top: 4, right: 8, left: 0, bottom: 24 }}
              barCategoryGap="30%"
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis
                dataKey="plantName"
                tick={{ fill: TICK_COLOR, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-30}
                textAnchor="end"
              />
              <YAxis
                tick={{ fill: TICK_COLOR, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip contentStyle={tooltipContentStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Legend
                wrapperStyle={{ fontSize: '12px', color: TICK_COLOR, paddingTop: '8px' }}
              />
              <Bar dataKey="ordenes" name="Órdenes"  fill={PALETTE.ordenes}  radius={[4, 4, 0, 0]} />
              <Bar dataKey="reportes" name="Reportes" fill={PALETTE.reportes} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* Tendencia de reportes (últimos 6 meses) */}
      <SectionCard title="Reportes recibidos (últimos 6 meses)">
        {tendenciaData.length === 0 ? (
          <EmptyState label="Sin datos" />
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
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
                  dot={{ r: 4, fill: PALETTE.reportes, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: PALETTE.reportes, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      {/* % NG por planta + Top clientes (2 columnas en desktop) */}
      <div className="shrink-0 grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* % NG por planta — horizontal BarChart */}
        <SectionCard title="% NG por planta">
          {ngPlantaData.length === 0 ? (
            <EmptyState label="Sin datos" />
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ngPlantaData}
                  layout="vertical"
                  margin={{ top: 4, right: 40, left: 4, bottom: 4 }}
                  barCategoryGap="25%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: TICK_COLOR, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="plantName"
                    tick={{ fill: TICK_COLOR, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={130}
                    tickFormatter={(name: string) =>
                      name.length > 22 ? `${name.slice(0, 22)}…` : name
                    }
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
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        {/* Top clientes por piezas — horizontal BarChart */}
        <SectionCard title="Top clientes por piezas">
          {topClientesData.length === 0 ? (
            <EmptyState label="Sin datos" />
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topClientesData}
                  layout="vertical"
                  margin={{ top: 4, right: 40, left: 4, bottom: 4 }}
                  barCategoryGap="25%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: TICK_COLOR, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => v.toLocaleString('es-MX')}
                  />
                  <YAxis
                    type="category"
                    dataKey="clientName"
                    tick={{ fill: TICK_COLOR, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={130}
                    tickFormatter={(name: string) =>
                      name.length > 22 ? `${name.slice(0, 22)}…` : name
                    }
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
                    fill={PALETTE.ordenes}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

      </div>

    </div>
  )
}
