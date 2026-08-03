export type UserRole = 'supervisor' | 'inspector' | 'cliente' | 'capturacion'

export interface SessionPayload {
  userId: string
  role: UserRole
  expiresAt: Date
}
