import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const createPrismaClient = () => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter, log: ['error'] })
}

// 2. Patrón Singleton para evitar agotar las conexiones en Next.js
// durante el modo desarrollo (Hot-Reloading)
const globalForPrisma = globalThis as unknown as { 
  prisma: ReturnType<typeof createPrismaClient> | undefined 
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}