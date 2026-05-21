'use server'

import { z } from 'zod'
import { prisma } from '@/back/db/prisma'
import { getSession } from '@/back/services/session'

export type IncidentInput = { description: string; count: number }

export type UpdateInspectionItemState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined

const IncidentSchema = z.object({
  description: z.string().min(1),
  count: z.number().int().min(0),
})

const Schema = z.object({
  itemId: z.number().int().positive(),
  ok: z.number().min(0),
  ng: z.number().min(0),
  recovered: z.number().min(0),
  incidents: z.array(IncidentSchema),
})

export async function updateInspectionItemAction(
  _state: UpdateInspectionItemState,
  formData: FormData,
): Promise<UpdateInspectionItemState> {
  const session = await getSession()
  // FIX: session uses userId, not id
  if (!session || session.rol !== 'supervisor') {
    return { ok: false, error: 'No autorizado' }
  }

  const itemId = parseInt(String(formData.get('itemId') ?? ''), 10)
  const ok = parseFloat(String(formData.get('ok') ?? '0'))
  const ng = parseFloat(String(formData.get('ng') ?? '0'))
  const recovered = parseFloat(String(formData.get('recovered') ?? '0'))

  // Parse incidents JSON array from form
  let incidents: IncidentInput[] = []
  try {
    const raw = formData.get('incidents')
    if (raw) incidents = JSON.parse(String(raw))
  } catch {
    return { ok: false, error: 'Formato de incidencias inválido' }
  }

  const parsed = Schema.safeParse({ itemId, ok, ng, recovered, incidents })
  if (!parsed.success) {
    return { ok: false, error: 'Datos inválidos' }
  }

  // Verify the item belongs to a report owned by this supervisor
  const item = await prisma.inspectionItem.findFirst({
    where: { id: parsed.data.itemId },
    include: {
      session: {
        include: {
          dailyReport: {
            include: {
              order: { select: { supervisorId: true } },
            },
          },
        },
      },
    },
  })

  if (!item) return { ok: false, error: 'Ítem no encontrado' }

  // FIX: use session.userId (not session.id)
  if (item.session.dailyReport.order.supervisorId !== session.userId) {
    return { ok: false, error: 'No tienes permiso para editar este ítem' }
  }

  // Scrap is derived server-side — never trust the client-supplied value
  const computedScrap = Math.max(0, parsed.data.ng - parsed.data.recovered)

  // Compute deltas for report-level totals
  const oldOk = Number(item.ok)
  const oldNg = Number(item.ng)
  const oldScrap = Number(item.scrap)
  const oldRecovered = Number(item.recovered)

  const diffOk = parsed.data.ok - oldOk
  const diffNg = parsed.data.ng - oldNg
  const diffScrap = computedScrap - oldScrap
  const diffRecovered = parsed.data.recovered - oldRecovered

  // Filter out zero-count incidents before saving
  const cleanIncidents = parsed.data.incidents.filter((inc) => inc.count > 0 && inc.description.trim() !== '')

  try {
    await prisma.$transaction([
      prisma.inspectionItem.update({
        where: { id: parsed.data.itemId },
        data: {
          ok: parsed.data.ok,
          ng: parsed.data.ng,
          scrap: computedScrap,
          recovered: parsed.data.recovered,
          incidents: cleanIncidents,
        },
      }),
      prisma.dailyReport.update({
        where: { id: item.session.dailyReportId },
        data: {
          totalOk: { increment: diffOk },
          totalNg: { increment: diffNg },
          totalScrap: { increment: diffScrap },
          totalRecovered: { increment: diffRecovered },
        },
      }),
    ])

    return { ok: true }
  } catch {
    return { ok: false, error: 'Error inesperado al actualizar el ítem' }
  }
}
