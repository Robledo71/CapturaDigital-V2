export type InformalOrderRow = {
  ordenInformalId: number
  itemOrdenInformalId: number
  tipoOrden: 'OV' | 'OA'
  clienteId: number
  clienteNombre: string | null
  plantaId: number | null
  plantaNombre: string | null
  numeroParte: string
  nombreParte: string | null
  solicitanteNombre: string | null
  inspectores: { id: number; name: string }[]
  estadoReporte: 'ENVIADO' | 'FIRMADO' | null
}
