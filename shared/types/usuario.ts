export type UsuarioRow = {
  id: number
  nombreCompleto: string
  codigoEmpleado: string
  puesto: string
  plantaId: number | null
  plantaNombre: string | null
  rol: 'admin' | 'supervisor' | 'capturacion' | 'lider'
  correo: string
  isActive: boolean
}
