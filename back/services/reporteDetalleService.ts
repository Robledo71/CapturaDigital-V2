'server-only'

import { prisma } from '@/back/db/prisma'

export type SamplingRule = {
  min: number
  max: number
  sampleSize: number
  maxDefects: number
}

export type SamplingItemRule = SamplingRule & {
  id: number
  description: string
  inspected: number
  rangeLabel: string
}

export type IncidentEntry = {
  description: string
  count: number
}

export type InspectionItemRow = {
  id: number
  description: string
  inspected: number
  ok: number
  ng: number
  scrap: number
  recovered: number
  incidents: IncidentEntry[]
  lote: string | null
  series: string | null
  otro: string | null
}

export type ReporteDetalleData = {
  consecutiveNumber: string
  status: string
  reportDate: Date
  createdAt: Date

  cliente: string
  planta: string
  cotizacion: string
  parte: string

  totalInspected: number
  totalOk: number
  totalNg: number
  totalScrap: number
  totalRecovered: number
  totalIncidents: number
  pzsPorIncidencia: number
  samplingItems: SamplingItemRule[]
  inspectionItems: InspectionItemRow[]
  sampleSize: number
  sampleNg: number
  sampleApproved: boolean
  sampledAt: Date | null
  signedAt: Date | null
  publishedAt: Date | null

  operadores: string
  turno: string
  tabletAlias: string

  sessionCreatedAt: Date | null
  sessionFinishedAt: Date | null

  supervisorName: string

  isLegacy: boolean
  legacyCsvTable: unknown
}

export const SAMPLING_RULES: SamplingRule[] = [
  { min: 2, max: 8, sampleSize: 2, maxDefects: 1 },
  { min: 9, max: 15, sampleSize: 2, maxDefects: 1 },
  { min: 16, max: 25, sampleSize: 2, maxDefects: 1 },
  { min: 26, max: 50, sampleSize: 2, maxDefects: 1 },
  { min: 51, max: 90, sampleSize: 2, maxDefects: 1 },
  { min: 91, max: 150, sampleSize: 2, maxDefects: 1 },
  { min: 151, max: 280, sampleSize: 5, maxDefects: 1 },
  { min: 281, max: 500, sampleSize: 8, maxDefects: 1 },
  { min: 501, max: 1200, sampleSize: 12, maxDefects: 2 },
  { min: 1201, max: 3200, sampleSize: 20, maxDefects: 2 },
  { min: 3201, max: 10000, sampleSize: 32, maxDefects: 3 },
  { min: 10001, max: 35000, sampleSize: 50, maxDefects: 4 },
  { min: 35001, max: 150000, sampleSize: 80, maxDefects: 5 },
  { min: 150001, max: 500000, sampleSize: 125, maxDefects: 6 },
]

const SHIFT_LABEL: Record<number, string> = {
  1: 'Turno 1',
  2: 'Turno 2',
}

function formatRangeLabel(rule: SamplingRule): string {
  return `${rule.min.toLocaleString('es-MX')} a ${rule.max.toLocaleString('es-MX')}`
}

export function getSamplingRule(inspected: number): SamplingRule | null {
  return SAMPLING_RULES.find((rule) => inspected >= rule.min && inspected <= rule.max) ?? null
}

function mapSamplingItem(item: {
  id: number
  description: string | null
  inspected: unknown
}): SamplingItemRule | null {
  const inspected = Math.floor(Number(item.inspected))
  const rule = getSamplingRule(inspected)

  if (!rule) return null

  return {
    id: item.id,
    description: item.description?.trim() || `Item ${item.id}`,
    inspected,
    min: rule.min,
    max: rule.max,
    sampleSize: rule.sampleSize,
    maxDefects: rule.maxDefects,
    rangeLabel: formatRangeLabel(rule),
  }
}

function normalizeIncidents(raw: unknown): IncidentEntry[] {
  if (!raw || typeof raw !== 'object') return []

  if (Array.isArray(raw)) {
    return (raw as unknown[])
      .filter(
        (entry): entry is { description: string; count: number } =>
          entry !== null &&
          typeof entry === 'object' &&
          typeof (entry as Record<string, unknown>).description === 'string' &&
          typeof (entry as Record<string, unknown>).count === 'number',
      )
      .filter((entry) => entry.count > 0 && entry.description.trim() !== '')
  }

  return Object.entries(raw as Record<string, unknown>)
    .filter(([desc, count]) => typeof count === 'number' && (count as number) > 0 && desc.trim() !== '')
    .map(([description, count]) => ({ description, count: count as number }))
}

function mapInspectionItemRow(item: {
  id: number
  description: string | null
  inspected: unknown
  ok: unknown
  ng: unknown
  scrap: unknown
  recovered: unknown
  incidents: unknown
  lote: string | null
  series: string | null
  otro: string | null
}): InspectionItemRow {
  return {
    id: item.id,
    description: item.description?.trim() || `Item ${item.id}`,
    inspected: Math.floor(Number(item.inspected)),
    ok: Math.floor(Number(item.ok)),
    ng: Math.floor(Number(item.ng)),
    scrap: Math.floor(Number(item.scrap)),
    recovered: Math.floor(Number(item.recovered)),
    incidents: normalizeIncidents(item.incidents),
    lote: item.lote ?? null,
    series: item.series ?? null,
    otro: item.otro ?? null,
  }
}

export async function getReporteDetalle(
  consecutiveNumber: string,
  supervisorId: string,
): Promise<ReporteDetalleData | null> {
  const report = await prisma.dailyReport.findFirst({
    where: {
      consecutiveNumber,
      OR: [
        { order: { supervisorId } },
        { order: { supervisorId: null } },
      ],
    },
    include: {
      order: {
        include: {
          client: true,
          plant: true,
          supervisor: true,
        },
      },
      quotation: true,
      sessions: {
        orderBy: { shift: 'asc' },
        include: {
          tablet: true,
          items: true,
        },
      },
    },
  })

  if (!report) return null

  if (report.source === 'legacy') {
    return {
      consecutiveNumber: report.consecutiveNumber,
      status: report.status,
      reportDate: report.reportDate,
      createdAt: report.createdAt,

      cliente: report.order.client.name,
      planta: report.order.plant.name,
      cotizacion: report.quotation?.consecutiveNumber ?? report.order.consecutiveNumber,
      parte: report.order.partNumber ?? '—',

      totalInspected: Number(report.totalInspected),
      totalOk: Number(report.totalOk),
      totalNg: Number(report.totalNg),
      totalScrap: Number(report.totalScrap),
      totalRecovered: Number(report.totalRecovered),
      totalIncidents: 0,
      pzsPorIncidencia: 0,
      samplingItems: [],
      inspectionItems: [],
      sampleSize: 0,
      sampleNg: 0,
      sampleApproved: true,
      sampledAt: null,
      signedAt: null,
      publishedAt: report.publishedAt,

      operadores: '—',
      turno: '—',
      tabletAlias: '—',

      sessionCreatedAt: null,
      sessionFinishedAt: null,

      supervisorName: report.order.supervisor?.nombreCompleto ?? 'Sin asignar',

      isLegacy: true,
      legacyCsvTable: report.legacyCsvTable,
    }
  }

  const allItems = report.sessions.flatMap((s) => s.items)
  const samplingItems = allItems
    .map(mapSamplingItem)
    .filter((item): item is SamplingItemRule => item !== null)

  const totalRecovered = allItems.reduce((sum, item) => sum + Number(item.recovered), 0)
  const totalIncidents = allItems.filter((item) => Number(item.ng) > 0).length
  const totalNg = Number(report.totalNg)
  const pzsPorIncidencia = totalIncidents > 0 ? Math.round(totalNg / totalIncidents) : 0

  const primarySession = report.sessions[0] ?? null

  return {
    consecutiveNumber: report.consecutiveNumber,
    status: report.status,
    reportDate: report.reportDate,
    createdAt: report.createdAt,

    cliente: report.order.client.name,
    planta: report.order.plant.name,
    cotizacion: report.quotation?.consecutiveNumber ?? report.order.consecutiveNumber,
    parte: report.order.partNumber ?? '—',

    totalInspected: Number(report.totalInspected),
    totalOk: Number(report.totalOk),
    totalNg,
    totalScrap: Number(report.totalScrap),
    totalRecovered,
    totalIncidents,
    pzsPorIncidencia,
    samplingItems,
    inspectionItems: allItems.map(mapInspectionItemRow),
    sampleSize: report.sampleSize ?? 0,
    sampleNg: report.sampleNg ?? 0,
    sampleApproved: report.sampleApproved ?? true,
    sampledAt: report.sampledAt ?? null,
    signedAt: report.signedAt ?? null,
    publishedAt: report.publishedAt ?? null,

    operadores: primarySession?.operadores ?? '-',
    turno: primarySession?.shift != null ? (SHIFT_LABEL[primarySession.shift] ?? '-') : '-',
    tabletAlias: primarySession
      ? (primarySession.tablet.alias ?? primarySession.tablet.serialNumber)
      : '-',

    sessionCreatedAt: primarySession?.createdAt ?? null,
    sessionFinishedAt: primarySession?.finishedAt ?? null,

    supervisorName: report.order.supervisor?.nombreCompleto ?? 'Sin asignar',

    isLegacy: false,
    legacyCsvTable: null,
  }
}

export type SamplingDecisionInput = {
  consecutiveNumber: string
  supervisorId: string
  decision: 'approve' | 'reject'
  defectsByItem: Record<number, number>
  notes?: string
}

export type SamplingDecisionResult =
  | { ok: true; status: 'sampling' | 'pending' }
  | { ok: false; reason: 'not_found' | 'invalid_status' | 'no_sampling_items' | 'rule_failed' | 'notes_required' }

export async function registerSamplingDecision(
  input: SamplingDecisionInput,
): Promise<SamplingDecisionResult> {
  const report = await prisma.dailyReport.findFirst({
    where: {
      consecutiveNumber: input.consecutiveNumber,
      order: { supervisorId: input.supervisorId },
    },
    include: {
      sessions: {
        include: {
          items: true,
        },
      },
    },
  })

  if (!report) return { ok: false, reason: 'not_found' }
  if (!['submitted', 'sampling'].includes(report.status)) return { ok: false, reason: 'invalid_status' }

  const samplingItems = report.sessions
    .flatMap((session) => session.items)
    .map(mapSamplingItem)
    .filter((item): item is SamplingItemRule => item !== null)

  if (samplingItems.length === 0) return { ok: false, reason: 'no_sampling_items' }

  const passed = samplingItems.every((item) => {
    const defects = Math.max(0, Math.floor(Number(input.defectsByItem[item.id] ?? 0)))
    return defects <= item.maxDefects
  })

  if (input.decision === 'approve' && !passed) return { ok: false, reason: 'rule_failed' }
  if (input.decision === 'reject' && !input.notes?.trim()) return { ok: false, reason: 'notes_required' }

  const status = input.decision === 'approve' ? 'sampling' : 'pending'
  const observations = input.notes?.trim()
    ? [report.observations, `Muestreo: ${input.notes.trim()}`].filter(Boolean).join('\n')
    : report.observations

  // Compute totals from the qualifying sampling items
  const totalSampleSize = samplingItems.reduce((sum, item) => sum + item.sampleSize, 0)
  const totalSampleNg = samplingItems.reduce((sum, item) => {
    const defects = Math.max(0, Math.floor(input.defectsByItem[item.id] ?? 0))
    return sum + defects
  }, 0)

  await prisma.dailyReport.update({
    where: { id: report.id },
    data: {
      status,
      observations,
      sampleSize: totalSampleSize,
      sampleNg: totalSampleNg,
      sampleApproved: input.decision === 'approve',
      sampledAt: input.decision === 'approve' ? new Date() : null,
    },
  })

  return { ok: true, status }
}

export type ReportStatusTransitionResult =
  | { ok: true; status: 'signed' | 'published' }
  | { ok: false; reason: 'not_found' | 'invalid_status' }

export async function signReporte(
  consecutiveNumber: string,
  supervisorId: string,
): Promise<ReportStatusTransitionResult> {
  const report = await prisma.dailyReport.findFirst({
    where: {
      consecutiveNumber,
      order: { supervisorId },
    },
    select: { id: true, status: true },
  })

  if (!report) return { ok: false, reason: 'not_found' }
  if (report.status !== 'sampling') return { ok: false, reason: 'invalid_status' }

  await prisma.dailyReport.update({
    where: { id: report.id },
    data: { status: 'signed', signedAt: new Date() },
  })

  return { ok: true, status: 'signed' }
}

export async function publishReporte(
  consecutiveNumber: string,
  supervisorId: string,
): Promise<ReportStatusTransitionResult> {
  const report = await prisma.dailyReport.findFirst({
    where: {
      consecutiveNumber,
      order: { supervisorId },
    },
    select: { id: true, status: true },
  })

  if (!report) return { ok: false, reason: 'not_found' }
  if (report.status !== 'signed') return { ok: false, reason: 'invalid_status' }

  await prisma.dailyReport.update({
    where: { id: report.id },
    data: { status: 'published', publishedAt: new Date() },
  })

  return { ok: true, status: 'published' }
}
