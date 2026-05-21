export type UsuarioRow = {
  id: string
  nombreCompleto: string
  codigoEmpleado: string
  puesto: string
  planta: string
  rol: 'admin' | 'supervisor' | 'capturacion' | 'inspector' | 'lider'
  correo: string
  isActive: boolean
}
