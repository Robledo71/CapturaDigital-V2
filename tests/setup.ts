import { beforeEach, vi } from 'vitest'

// El proyecto ya no usa Prisma — toda consulta a BD pasa por la API qb_sync.

// Reset all mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
})
