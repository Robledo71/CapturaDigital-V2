import { beforeEach, vi } from 'vitest'

// Mock Prisma singleton antes de que los módulos lo importen
vi.mock('@/back/db/prisma', () => ({
  prisma: {
    order: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn(), count: vi.fn() },
    quotation: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    orderItem: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    inspectionSession: { findFirst: vi.fn(), findMany: vi.fn() },
    dailyReport: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), count: vi.fn(), update: vi.fn() },
    dailyReportItem: { findMany: vi.fn(), update: vi.fn() },
    plant: { findFirst: vi.fn(), findMany: vi.fn() },
    region: { findFirst: vi.fn() },
    client: { upsert: vi.fn(), findMany: vi.fn() },
    tablet: { findMany: vi.fn(), findUnique: vi.fn() },
    usuario: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: vi.fn() },
    passwordResetToken: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    samplingResult: { findMany: vi.fn() },
    $transaction: vi.fn((fn: unknown) =>
      typeof fn === 'function'
        ? fn({
            dailyReport: {
              findMany: vi.fn().mockResolvedValue([]),
              count: vi.fn().mockResolvedValue(0),
            },
          })
        : Promise.all(fn as Promise<unknown>[])
    ),
  },
}))

// Reset all mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
})
