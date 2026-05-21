import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyInboundAuth } from '@/back/lib/inboundAuth'
import { inboundPayloadSchema } from '@/back/validators/inboundSchemas'
import { ingestInbound } from '@/back/services/sync/inboundService'

export async function POST(request: Request) {
  const auth = verifyInboundAuth(request)
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: 'UNAUTHORIZED', message: auth.reason },
      { status: 401 },
    )
  }

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'INVALID_JSON', message: 'El cuerpo debe ser JSON válido' },
      { status: 400 },
    )
  }

  const parsed = inboundPayloadSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'VALIDATION_FAILED',
        message: 'Payload inválido',
        issues: parsed.error.issues,
      },
      { status: 400 },
    )
  }

  const result = await ingestInbound(parsed.data)

  if (!result.ok) {
    const status =
      result.error === 'INTERNAL_ERROR' ? 500
      : result.error === 'MISSING_PARENT_ID' ? 400
      : 404
    return NextResponse.json(result, { status })
  }

  revalidatePath('/supervisor/carga-trabajo')
  revalidatePath('/supervisor/reportes')

  return NextResponse.json(result, { status: 200 })
}
