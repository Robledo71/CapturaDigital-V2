export type UserRole = 'supervisor' | 'inspector' | 'cliente' | 'capturacion'

export interface SessionPayload {
  userId: string
  role: UserRole
  tabletId: string | null
  expiresAt: Date
}
