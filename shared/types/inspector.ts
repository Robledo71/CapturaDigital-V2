export type InspectorTrabajoActual = {
  partNumber: string | null
  quotationConsecutive: string | null
}

export type InspectorRow = {
  empleadoId: number
  codigoUsuario: string
  nombreEmpleado: string
  apellidoPaterno: string
  apellidoMaterno: string
  nombreCompleto: string
  plantas: { id: number; nombre: string }[]
  activo: boolean
  // true si el inspector tiene una sesión de inspección activa (trabajando).
  ocupado: boolean
  // Detalle del trabajo en curso (parte / consecutivo de cotización), o null si desocupado.
  trabajoActual: InspectorTrabajoActual | null
}
