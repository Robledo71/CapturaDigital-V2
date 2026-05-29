import 'server-only'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import nodemailer from 'nodemailer'
import { findByCorreo } from '@/back/repositories/userRepository'
import { createResetToken, findResetToken } from '@/back/repositories/passwordResetRepository'
import { prisma } from '@/back/db/prisma'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 hora

function createTransport() {
  const port = Number(process.env.SMTP_PORT ?? 465)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.hostinger.com',
    port,
    secure: port === 465, // SSL en 465, STARTTLS en 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await findByCorreo(email)
  if (!user || !user.isActive) return // Siempre silencioso — no revelar si el email existe

  const rawToken = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS)
  await createResetToken(user.id, rawToken, expiresAt)

  const resetUrl = `${APP_URL}/reset-password?token=${rawToken}`
  console.log('[password-reset] URL generada:', resetUrl)
  const from = process.env.SMTP_FROM ?? `Captura Digital <${process.env.SMTP_USER}>`

  const transporter = createTransport()
  await transporter.sendMail({
    from,
    to: user.correo,
    subject: 'Restablecer contraseña — Captura Digital',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1e3a5f">Restablecer contraseña</h2>
        <p>Hola ${user.nombreCompleto},</p>
        <p>Recibimos una solicitud para restablecer tu contraseña. Este enlace es válido por <strong>1 hora</strong>.</p>
        <p style="margin:28px 0">
          <a href="${resetUrl}"
             style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
            Restablecer contraseña
          </a>
        </p>
        <p style="color:#64748b;font-size:13px">Si no solicitaste este cambio, ignora este correo. Tu contraseña no cambiará.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
        <p style="color:#94a3b8;font-size:12px">Quality Bolca — Captura Digital</p>
      </div>
    `,
  })
}

export type ResetPasswordResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_token' | 'expired_token' | 'same_password' }

export async function resetPassword(rawToken: string, newPassword: string): Promise<ResetPasswordResult> {
  const record = await findResetToken(rawToken)

  if (!record) return { ok: false, reason: 'invalid_token' }
  if (record.usedAt) return { ok: false, reason: 'invalid_token' }
  if (record.expiresAt < new Date()) return { ok: false, reason: 'expired_token' }

  const isSame = await bcrypt.compare(newPassword, record.user.contrasena)
  if (isSame) return { ok: false, reason: 'same_password' }

  const hashedPassword = await bcrypt.hash(newPassword, 12)

  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({ where: { id: record.userId }, data: { contrasena: hashedPassword } })
    await tx.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } })
  })

  return { ok: true }
}
