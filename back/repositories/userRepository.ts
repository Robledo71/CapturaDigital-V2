import 'server-only'
import { Rol } from '@prisma/client'
import { prisma } from '@/back/db/prisma'

export async function findByCodigoEmpleado(codigoEmpleado: string) {
  return prisma.usuario.findUnique({ where: { codigoEmpleado } })
}

export async function findByCorreo(correo: string) {
  return prisma.usuario.findUnique({ where: { correo } })
}

export async function findById(id: string) {
  return prisma.usuario.findUnique({ where: { id } })
}

export async function findAllUsuarios() {
  return prisma.usuario.findMany({ orderBy: { createdAt: 'asc' } })
}

export type CreateUsuarioData = {
  nombreCompleto: string
  codigoEmpleado: string
  puesto: string
  planta: string
  rol: 'supervisor' | 'capturacion' | 'admin' | 'lider'
  contrasena: string
  correo: string
}

export async function createUsuario(data: CreateUsuarioData) {
  return prisma.usuario.create({
    data: {
      nombreCompleto: data.nombreCompleto,
      codigoEmpleado: data.codigoEmpleado,
      puesto: data.puesto,
      planta: data.planta,
      rol: data.rol as Rol,
      contrasena: data.contrasena,
      correo: data.correo,
    },
  })
}

export type UpdateUsuarioData = {
  nombreCompleto?: string
  codigoEmpleado?: string
  puesto?: string
  planta?: string
  rol?: 'admin' | 'supervisor' | 'capturacion' | 'lider'
  correo?: string
}

export async function updateUsuario(id: string, data: UpdateUsuarioData) {
  return prisma.usuario.update({
    where: { id },
    data: {
      ...data,
      ...(data.rol ? { rol: data.rol as Rol } : {}),
    },
  })
}

export async function incrementFailedAttempts(id: string) {
  return prisma.usuario.update({
    where: { id },
    data: { failedLoginAttempts: { increment: 1 } },
  })
}

export async function lockAccount(id: string, until: Date) {
  return prisma.usuario.update({
    where: { id },
    data: { lockedUntil: until, failedLoginAttempts: 0 },
  })
}

export async function resetFailedAttempts(id: string) {
  return prisma.usuario.update({
    where: { id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  })
}

export type UsuarioRow = {
  id: string
  nombreCompleto: string
  codigoEmpleado: string
  puesto: string
  planta: string
  rol: string
  correo: string
  isActive: boolean
}

export async function findUsuariosPaginated(
  page: number,
  pageSize: number,
): Promise<{ data: UsuarioRow[]; total: number }> {
  const skip = (page - 1) * pageSize

  const [data, total] = await Promise.all([
    prisma.usuario.findMany({
      select: {
        id: true,
        nombreCompleto: true,
        codigoEmpleado: true,
        puesto: true,
        planta: true,
        rol: true,
        correo: true,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: pageSize,
    }),
    prisma.usuario.count(),
  ])

  return { data, total }
}
