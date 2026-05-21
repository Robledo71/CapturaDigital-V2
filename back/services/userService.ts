'server-only'

import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import type { UsuarioRow } from '@/shared/types/usuario'
import {
  findByCodigoEmpleado,
  findByCorreo,
  findById,
  findAllUsuarios,
  findUsuariosPaginated,
  createUsuario as repoCreateUsuario,
  updateUsuario as repoUpdateUsuario,
} from '@/back/repositories/userRepository'

export type CreateUsuarioInput = {
  nombreCompleto: string
  codigoEmpleado: string
  puesto: string
  planta: string
  rol: 'supervisor' | 'capturacion' | 'admin' | 'lider'
  correo: string
  contrasena: string
}

export type CreateUsuarioResult =
  | { ok: true; usuario: UsuarioRow }
  | { ok: false; reason: 'duplicate_codigo' | 'duplicate_correo' }

function mapToRow(dbUser: {
  id: string
  nombreCompleto: string
  codigoEmpleado: string
  puesto: string
  planta: string
  rol: string
  correo: string
  isActive: boolean
}): UsuarioRow {
  return {
    id: dbUser.id,
    nombreCompleto: dbUser.nombreCompleto,
    codigoEmpleado: dbUser.codigoEmpleado,
    puesto: dbUser.puesto,
    planta: dbUser.planta,
    rol: dbUser.rol as UsuarioRow['rol'],
    correo: dbUser.correo,
    isActive: dbUser.isActive,
  }
}

export async function createUsuario(
  input: CreateUsuarioInput,
): Promise<CreateUsuarioResult> {
  const existingCodigo = await findByCodigoEmpleado(input.codigoEmpleado)
  if (existingCodigo) {
    return { ok: false, reason: 'duplicate_codigo' }
  }

  const existingCorreo = await findByCorreo(input.correo)
  if (existingCorreo) {
    return { ok: false, reason: 'duplicate_correo' }
  }

  const hashedPassword = await bcrypt.hash(input.contrasena, 10)

  const dbUser = await repoCreateUsuario({
    nombreCompleto: input.nombreCompleto,
    codigoEmpleado: input.codigoEmpleado,
    puesto: input.puesto,
    planta: input.planta,
    rol: input.rol,
    contrasena: hashedPassword,
    correo: input.correo,
  })

  return { ok: true, usuario: mapToRow(dbUser) }
}

export async function getAllUsuarios(): Promise<UsuarioRow[]> {
  const rows = await findAllUsuarios()
  return rows.map(mapToRow)
}

export async function getUsuariosPaginated(
  page: number,
  pageSize: number,
): Promise<{ data: UsuarioRow[]; total: number }> {
  const { data, total } = await findUsuariosPaginated(page, pageSize)
  return { data: data.map(mapToRow), total }
}

export type UpdateUsuarioInput = {
  id: string
  nombreCompleto: string
  codigoEmpleado: string
  puesto: string
  planta: string
  rol: 'admin' | 'supervisor' | 'capturacion' | 'lider'
  correo: string
}

export type UpdateUsuarioResult =
  | { ok: true; usuario: UsuarioRow }
  | { ok: false; reason: 'duplicate_codigo' | 'duplicate_correo' | 'not_found' }

export async function updateUsuario(
  input: UpdateUsuarioInput,
): Promise<UpdateUsuarioResult> {
  // Verify the user exists
  const existing = await findById(input.id)
  if (!existing) {
    return { ok: false, reason: 'not_found' }
  }

  // If codigoEmpleado is changing, verify it is not taken by another user
  if (input.codigoEmpleado !== existing.codigoEmpleado) {
    const conflictCodigo = await findByCodigoEmpleado(input.codigoEmpleado)
    if (conflictCodigo) {
      return { ok: false, reason: 'duplicate_codigo' }
    }
  }

  // If correo is changing, verify it is not taken by another user
  if (input.correo !== existing.correo) {
    const conflictCorreo = await findByCorreo(input.correo)
    if (conflictCorreo) {
      return { ok: false, reason: 'duplicate_correo' }
    }
  }

  try {
    const updated = await repoUpdateUsuario(input.id, {
      nombreCompleto: input.nombreCompleto,
      codigoEmpleado: input.codigoEmpleado,
      puesto: input.puesto,
      planta: input.planta,
      rol: input.rol,
      correo: input.correo,
    })

    return { ok: true, usuario: mapToRow(updated) }
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
