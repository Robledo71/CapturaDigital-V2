// TODO Fase 4: Client model eliminado del esquema. Funciones stubbeadas.
import 'server-only'
import type { ClienteRow } from '@/shared/types/cliente'

export type CreateClienteInput = {
  nombre: string
  direccion?: string
  requiereOC: boolean
}

export type UpdateClienteInput = {
  id: number
  nombre: string
  direccion?: string | null
  requiereOC: boolean
}

export type UpdateClienteResult =
  | { ok: true; cliente: ClienteRow }
  | { ok: false; reason: 'not_found' }

export async function getAllClientes(): Promise<ClienteRow[]> {
  return []
}

export async function createCliente(
  _input: CreateClienteInput,
): Promise<{ ok: true; cliente: ClienteRow }> {
  throw new Error('Client model no existe en el esquema actual — Fase 4 pendiente')
}

export async function updateCliente(
  _input: UpdateClienteInput,
): Promise<UpdateClienteResult> {
  return { ok: false, reason: 'not_found' }
}
