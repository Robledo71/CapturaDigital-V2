import 'server-only'

export type InboundAuthResult = { ok: true } | { ok: false; reason: string }

export function verifyInboundAuth(request: Request): InboundAuthResult {
  const expected = process.env.INBOUND_API_KEY?.trim()

  if (!expected) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, reason: 'INBOUND_API_KEY no configurada' }
    }
    console.warn('[inbound] INBOUND_API_KEY no configurada — aceptando todas las llamadas (solo dev)')
    return { ok: true }
  }

  const header = request.headers.get('authorization') ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  const provided = match?.[1]?.trim()

  if (!provided || provided !== expected) {
    return { ok: false, reason: 'API key inválida o ausente' }
  }

  return { ok: true }
}
