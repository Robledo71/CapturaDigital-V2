export type UsuarioRow = {
  id: number
  nombreCompleto: string
  nombreEmpleado: string
  apellidoPaterno: string
  apellidoMaterno: string
  codigoEmpleado: string
  plantaId: number | null
  plantaNombre: string | null
  // Todas las plantas activas asignadas al usuario (planta_id/plantaNombre arriba
  // reflejan solo la primera, por compatibilidad con consumidores existentes).
  plantas: { id: number; nombre: string }[]
  rol: 'admin' | 'supervisor' | 'capturacion' | 'lider' | 'servicio_cliente' | 'cliente'
  correo: string
  isActive: boolean
}
