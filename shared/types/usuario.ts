export type UsuarioRow = {
  id: number
  nombreCompleto: string
  codigoEmpleado: string
  puesto: string
  plantaId: number | null
  plantaNombre: string | null
  rol: 'admin' | 'supervisor' | 'capturacion' | 'lider' | 'servicio_cliente' | 'cliente'
  correo: string
  isActive: boolean
}
