'use server'

import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/back/db/prisma'
import { getSession } from '@/back/services/session'

export type AssignDailyReportState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined

const Schema = z.object({
  dailyReportId: z.number().int().positive(),
  tabletId: z.number().int().positive(),
})

export async function assignDailyReportAction(
  _state: AssignDailyReportState,
  formData: FormData,
): Promise<AssignDailyReportState> {
  const session = await getSession()
  if (!session || session.rol !== 'supervisor') {
    return { ok: false, error: 'No autorizado' }
  }

  const dailyReportId = parseInt(String(formData.get('dailyReportId') ?? ''), 10)
  const tabletId = parseInt(String(formData.get('tabletId') ?? ''), 10)

  const parsed = Schema.safeParse({ dailyReportId, tabletId })
  if (!parsed.success) {
    return { ok: false, error: 'Datos inválidos' }
  }

  const { dailyReportId: reportId, tabletId: tId } = parsed.data

  const report = await prisma.dailyReport.findFirst({
    where: { id: reportId, order: { supervisorId: session.userId } },
    select: { id: true },
  })
  if (!report) {
    return { ok: false, error: 'Reporte no encontrado' }
  }

  const tablet = await prisma.tablet.findFirst({
    where: { id: tId, status: 'activa' },
    select: { id: true },
  })
  if (!tablet) {
    return { ok: false, error: 'Tablet no disponible' }
  }

  try {
    await prisma.inspectionSession.create({
      data: {
        dailyReportId: reportId,
        tabletId: tId,
        status: 'in_progress',
      },
    })

    return { ok: true }
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return {
        ok: false,
        error: 'Ya existe una sesión para esta combinación de reporte y tablet',
      }
    }
    throw err
  }
}
