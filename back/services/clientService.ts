import 'server-only'
import { Prisma } from '@prisma/client'
import type { ClienteRow } from '@/shared/types/cliente'
import {
  findAllClients,
  findClientById,
  createClient as repoCreateClient,
  updateClient as repoUpdateClient,
} from '@/back/repositories/clientRepository'

type DbClientWithCount = Awaited<ReturnType<typeof findAllClients>>[number]

function mapToRow(dbClient: DbClientWithCount): ClienteRow {
  return {
    id: dbClient.id,
    nombre: dbClient.name,
    direccion: dbClient.address ?? null,
    requiereOC: dbClient.requirePurchaseOrder,
    ordenesActivas: dbClient._count.orders,
  }
}

export async function getAllClientes(): Promise<ClienteRow[]> {
  const rows = await findAllClients()
  return rows.map(mapToRow)
}

export type CreateClienteInput = {
  nombre: string
  direccion?: string
  requiereOC: boolean
}

export async function createCliente(
  input: CreateClienteInput,
): Promise<{ ok: true; cliente: ClienteRow }> {
  const dbClient = await repoCreateClient({
    name: input.nombre,
    address: input.direccion,
    requirePurchaseOrder: input.requiereOC,
  })

  // createClient does not return _count — re-fetch to get a consistent shape
  const withCount = await findAllClients().then((all) =>
    all.find((c) => c.id === dbClient.id),
  )

  // Newly created client has 0 active orders; construct the row directly if not found
  const cliente: ClienteRow = withCount
    ? mapToRow(withCount)
    : {
        id: dbClient.id,
        nombre: dbClient.name,
        direccion: dbClient.address ?? null,
        requiereOC: dbClient.requirePurchaseOrder,
        ordenesActivas: 0,
      }

  return { ok: true, cliente }
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

export async function updateCliente(
  input: UpdateClienteInput,
): Promise<UpdateClienteResult> {
  const existing = await findClientById(input.id)
  if (!existing) {
    return { ok: false, reason: 'not_found' }
  }

  try {
    await repoUpdateClient(input.id, {
      name: input.nombre,
      address: input.direccion,
      requirePurchaseOrder: input.requiereOC,
    })

    // Re-fetch with _count to return accurate active orders count
    const all = await findAllClients()
    const updated = all.find((c) => c.id === input.id)

    if (!updated) {
      return { ok: false, reason: 'not_found' }
    }

    return { ok: true, cliente: mapToRow(updated) }
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2025'
    ) {
      return { ok: false, reason: 'not_found' }
    }
    throw err
  }
}
