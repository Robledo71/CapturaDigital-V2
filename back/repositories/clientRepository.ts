// TODO Fase 4: Client model eliminado del esquema. Funciones stubbeadas.
import 'server-only'

export type CreateClientData = {
  name: string
  address?: string
  requirePurchaseOrder: boolean
}

export type UpdateClientData = {
  name?: string
  address?: string | null
  requirePurchaseOrder?: boolean
}

// Stub shape that matches what clientService expects
type ClientStub = {
  id: number
  name: string
  address: string | null
  requirePurchaseOrder: boolean
}

export async function findAllClients(): Promise<ClientStub[]> {
  return []
}

export async function findClientById(_id: number): Promise<ClientStub | null> {
  return null
}

export async function createClient(_data: CreateClientData): Promise<ClientStub> {
  throw new Error('Client model no existe en el esquema actual — Fase 4 pendiente')
}

export async function updateClient(_id: number, _data: UpdateClientData): Promise<ClientStub> {
  throw new Error('Client model no existe en el esquema actual — Fase 4 pendiente')
}
