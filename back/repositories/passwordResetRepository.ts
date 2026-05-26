import 'server-only'
import { createHash } from 'crypto'
import { prisma } from '@/back/db/prisma'

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

export async function createResetToken(userId: number, rawToken: string, expiresAt: Date) {
  const tokenHash = hashToken(rawToken)
  // Delete any previous unexpired tokens for this user first
  await prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } })
  return prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  })
}

export async function findResetToken(rawToken: string) {
  const tokenHash = hashToken(rawToken)
  return prisma.passwordResetToken.findFirst({ where: { tokenHash }, include: { user: true } })
}

export async function markTokenUsed(id: number) {
  return prisma.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } })
}
